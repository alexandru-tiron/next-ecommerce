// Fills a store with a demo catalogue: categories, brands, ~40 products with generated images, reviews and home page slides.
// Every document it creates has an id starting with "demo-" and demo: true, so re-running overwrites instead of duplicating.
//
// Usage (see scripts/README.md):
//   firebase emulators:exec --project demo-store "node scripts/seed-demo/seed.mjs --with-orders --admin-email admin@example.com"
//   node scripts/seed-demo/seed.mjs --project <id> --yes [--with-orders]
//
// Options:
//   --with-orders                 also create demo customers, ~6 months of orders and vouchers (for the analytics page)
//   --admin-email / --admin-password   emulators only: create a verified admin account to sign in with
//   --no-images                   skip rendering and uploading images (faster, for tests)
import { randomBytes, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { connectFirebase, downloadUrl, parseArgs } from "../lib/firebase.mjs";
import { categoryIconSvg, heroSvg, logoSvg, productSvg } from "./art.mjs";
import { brandColours, categories, customerNames, products, reviewers, reviewTexts, subcategories } from "./catalogue.mjs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const args = parseArgs();
const { projectId, bucket: bucketName, emulator } = connectFirebase(args, { write: true });
const db = getFirestore();
const bucket = getStorage().bucket(bucketName);
const withImages = !args["no-images"];
const DAY = 24 * 60 * 60 * 1000;
const VAT_RATE = 21;
const now = Date.now();

// Deterministic randomness, so a re-run produces the same store
let seed = 20261023;
const rand = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const pick = (list) => list[Math.floor(rand() * list.length)];
const int = (min, max) => min + Math.floor(rand() * (max - min + 1));
const round2 = (value) => Math.round(value * 100) / 100;
const slug = (text) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

// --- writes are collected, then committed in batches ---
const writes = [];
const set = (path, data) => writes.push([path, { ...data, demo: true }]);

// --- images: rendered with sharp, uploaded with a download token like the admin panel does ---
const uploads = [];
function image(objectPath, render, contentType) {
   if (!withImages) return "/product.svg";
   const token = randomUUID();
   uploads.push({ objectPath, render, contentType, token });
   return downloadUrl(bucketName, objectPath, token, emulator);
}
const webp = (svg, width) => () => sharp(Buffer.from(svg)).resize(width).webp({ quality: 85 }).toBuffer();
const rawSvg = (svg) => async () => Buffer.from(svg);

// --- catalogue ---
const categoryIds = {};
for (const [name, category] of Object.entries(categories)) {
   const id = `demo-cat-${slug(name)}`;
   categoryIds[name] = id;
   set(`Categories/${id}`, {
      name,
      description: category.description,
      icon: image(`Categories/Icons/${id}.svg`, rawSvg(categoryIconSvg(category.kind)), "image/svg+xml"),
      image: image(`Categories/Images/${id}.webp`, webp(heroSvg(category.image, ["#1f2937", "#db2777", "#2563eb"], "#f3f4f6"), 900), "image/webp"),
   });
}

const subcategoryIds = {};
for (const [name, sub] of Object.entries(subcategories)) {
   subcategoryIds[name] = `demo-sub-${slug(name)}`;
   set(`Categories/${categoryIds[sub.category]}/Subcategories/${subcategoryIds[name]}`, { name });
}

[...new Set(products.map((product) => product[1]))].forEach((brand, i) => {
   const id = `demo-brand-${slug(brand)}`;
   set(`Brands/${id}`, { name: brand, image: image(`Brands/${id}.webp`, webp(logoSvg(brand, brandColours[i % brandColours.length]), 480), "image/webp") });
});

let reviewCount = 0;
const productIndex = [];
for (const [subName, brand, name, basePrice, features, colourList, sizeOptions = []] of products) {
   const sub = subcategories[subName];
   const id = `demo-${slug(name)}`;
   const code = `${brand.slice(0, 3).toUpperCase()}-${int(1000, 9999)}`;
   const discounted = rand() < 0.3;
   const discountPrice = (price) => Math.floor(price * 0.85) + 0.99;
   const createdAt = new Date(now - int(1, 200) * DAY - int(0, DAY));
   const featureText = `${features[0]}, ${features[1]} and ${features[2]}`;
   const [mainColour, altColour] = [colourList[0][1], (colourList[1] ?? colourList[0])[1]];

   set(`Products/${id}`, {
      name,
      brand,
      category_name: sub.category,
      category_id: categoryIds[sub.category],
      subcategory_name: subName,
      subcategory_id: subcategoryIds[subName],
      product_code: code,
      price: basePrice,
      discount: discounted,
      ...(discounted ? { discount_price: discountPrice(basePrice) } : {}),
      stoc: rand() < 0.08 ? 0 : int(1, 40),
      sold: int(0, 400),
      weight: Math.round(sub.weight * (0.8 + rand() * 0.4)),
      short_description: `${name} with ${featureText}.`,
      long_description: `${sub.intro} The ${name} comes with ${featureText}.`,
      ...(sub.howTo ? { how_to: sub.howTo } : {}),
      product_images: [
         image(`Products/${id}/demo-1.webp`, webp(productSvg(sub.kind, mainColour, "#e5e7eb"), 800), "image/webp"),
         image(`Products/${id}/demo-2.webp`, webp(productSvg(sub.kind, altColour, "#dbeafe"), 800), "image/webp"),
      ],
      product_of_month: false,
      created_at: createdAt,
      updated_at: new Date(createdAt.getTime() + int(0, 20) * DAY),
   });
   productIndex.push({ id, name, code, price: basePrice, discounted, discountPrice, sizes: sizeOptions, image: `Products/${id}/demo-1.webp` });

   sizeOptions.forEach((option, i) =>
      set(`Products/${id}/SkuVariants/demo-sku-${i + 1}`, {
         type: "kilograms",
         name: option.name,
         price: option.price,
         code: `${code}-${slug(option.name).toUpperCase()}`,
         discount: discounted,
         ...(discounted ? { discount_price: discountPrice(option.price) } : {}),
      })
   );
   if (colourList.length > 1) {
      colourList.forEach(([colourName, hex], i) => set(`Products/${id}/Variants/demo-colour-${i + 1}`, { type: "colour", name: colourName, media: hex, code: `${code}-${slug(colourName).toUpperCase()}` }));
   }
   for (let r = 0, count = pick([0, 1, 2, 3, 3, 4, 5, 6]); r < count; r++) {
      const stars = pick([5, 5, 5, 4, 4, 4, 3, 2]);
      const reviewer = int(0, reviewers.length - 1);
      set(`Products/${id}/Reviews/demo-review-${r + 1}`, {
         date: new Date(Math.max(createdAt.getTime() + DAY, now - int(1, 150) * DAY)),
         stars,
         uid: `demo-reviewer-${reviewer + 1}`,
         username: reviewers[reviewer],
         verified: rand() < 0.7,
         review: pick(reviewTexts[stars]),
      });
      reviewCount++;
   }
}

[
   { id: "demo-slide-audio", order: 1, title: "Sound That Moves You", description: "Headphones, earbuds and speakers", url: "/list?cat=Audio", kinds: ["earbuds", "headphones", "speaker"], colors: ["#f9fafb", "#1f2937", "#2563eb"], background: "bg-gradient-to-r from-[#f5f7fa] to-[#e4e7eb]", bg: "#e5e7eb" },
   { id: "demo-slide-gaming", order: 2, title: "Level Up Your Game", description: "Consoles, controllers and headsets", url: "/list?cat=Gaming", kinds: ["controller", "console", "gamingHeadset"], colors: ["#1f2937", "#f9fafb", "#dc2626"], background: "bg-gradient-to-r from-[#eef2ff] to-[#c7d2fe]", bg: "#e0e7ff" },
   { id: "demo-slide-smart-home", order: 3, title: "Make Your Home Smarter", description: "Speakers, lighting and security", url: "/list?cat=Smart+Home", kinds: ["bulb", "smartSpeaker", "camera"], colors: ["#fde68a", "#334155", "#f8fafc"], background: "bg-gradient-to-r from-[#ecfdf5] to-[#a7f3d0]", bg: "#d1fae5" },
].forEach((slide) =>
   set(`Settings/Info/Slider/${slide.id}`, {
      title: slide.title,
      description: slide.description,
      url: slide.url,
      order: slide.order,
      background: slide.background,
      image: image(`Slides/${slide.id}.webp`, webp(heroSvg(slide.kinds, slide.colors, slide.bg), 1200), "image/webp"),
   })
);

// --- optional: customers, orders and vouchers ---
let orderCount = 0;
if (args["with-orders"]) {
   const customers = Array.from({ length: 24 }, (_, i) => {
      const first = pick(customerNames.first);
      const last = pick(customerNames.last);
      return {
         id: `demo-customer-${i + 1}`,
         first_name: first,
         last_name: last,
         email: `${first}.${last}${i + 1}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") + "@example.com",
         phone_no: `07${int(20, 89)}${String(int(0, 999999)).padStart(6, "0")}`,
         created_at: new Date(now - int(1, 220) * DAY),
         address: { id: `demo-address-${i + 1}`, city: "Bucharest", county: "București", postal_code: 10011 + i, street: "Demo Street", street_no: int(1, 120), business: false },
      };
   });
   customers.forEach((customer) => set(`Users/${customer.id}`, { email: customer.email, first_name: customer.first_name, last_name: customer.last_name, phone_no: customer.phone_no, created_at: customer.created_at }));

   const vouchers = {
      DEMO10: { type: "percent", value: 10, min_order: null, max_uses: null, expires_at: null, active: true, uses: 0 },
      SAVE50: { type: "fixed", value: 50, min_order: 300, max_uses: 200, expires_at: null, active: true, uses: 0 },
      SUMMER25: { type: "percent", value: 25, min_order: 500, max_uses: null, expires_at: new Date(now - 30 * DAY), active: true, uses: 0 },
   };
   const statusFor = (ageDays) => {
      const r = rand();
      if (ageDays > 14) return r < 0.92 ? "delivered" : r < 0.98 ? "rejected" : "shipped";
      if (ageDays > 5) return r < 0.5 ? "delivered" : r < 0.85 ? "shipped" : r < 0.95 ? "accepted" : "rejected";
      if (ageDays > 2) return r < 0.5 ? "shipped" : r < 0.9 ? "accepted" : "pending";
      return r < 0.6 ? "pending" : "accepted";
   };

   for (let ageDays = 179; ageDays >= 0; ageDays--) {
      for (let k = rand() < 0.45 + (180 - ageDays) / 400 ? int(1, ageDays < 30 ? 3 : 2) : 0; k > 0; k--) {
         const date = new Date(now - ageDays * DAY - int(0, ageDays === 0 ? 6 * 60 * 60 * 1000 : DAY));
         const eligible = customers.filter((customer) => customer.created_at <= date);
         const customer = eligible.length ? pick(eligible) : customers[0];
         const lines = [];
         for (let n = int(1, 3); n > 0; n--) {
            const product = pick(productIndex);
            if (lines.some((line) => line.product_id === product.id)) continue;
            const size = product.sizes.length ? pick(product.sizes) : null;
            const price = size ? size.price : product.price;
            lines.push({
               id: `line-${lines.length + 1}`,
               product_id: product.id,
               product_name: product.name,
               product_code: product.code,
               product_image: withImages ? downloadUrl(bucketName, product.image, "demo", emulator) : "/product.svg",
               product_price: price,
               discount: product.discounted,
               ...(product.discounted ? { discount_price: product.discountPrice(price) } : {}),
               quantity: rand() < 0.8 ? 1 : 2,
               ...(size ? { sku_variant_name: size.name } : {}),
            });
         }
         const subtotal = round2(lines.reduce((acc, line) => acc + (line.discount ? line.discount_price : line.product_price) * line.quantity, 0));
         const shippingPrice = subtotal >= 500 ? 0 : 25;
         let voucherCode = null;
         let voucherDiscount = 0;
         if (rand() < 0.15) {
            const usable = Object.entries(vouchers).filter(([, v]) => (!v.min_order || subtotal >= v.min_order) && (!v.expires_at || date < v.expires_at));
            if (usable.length) {
               const [code, voucher] = pick(usable);
               voucherCode = code;
               voucherDiscount = round2(Math.min(voucher.type === "percent" ? (subtotal * voucher.value) / 100 : voucher.value, subtotal));
               voucher.uses++;
            }
         }
         const total = round2(subtotal - voucherDiscount + shippingPrice);
         const status = statusFor(ageDays);
         orderCount++;
         set(`Orders/demo-order-${orderCount}`, {
            user_id: customer.id,
            email: customer.email,
            first_name: customer.first_name,
            last_name: customer.last_name,
            phone_no: customer.phone_no,
            shipping_address: customer.address,
            billing_address: customer.address,
            products: lines,
            shipping_price: shippingPrice,
            total,
            date,
            status,
            ...(status === "shipped" || status === "delivered" ? { tracking_number: `AWB${String(int(0, 9999999999)).padStart(10, "0")}` } : {}),
            is_business: false,
            voucher: Boolean(voucherCode),
            ...(voucherCode ? { voucher_id: voucherCode, voucher_discount: voucherDiscount } : {}),
            vat_rate: VAT_RATE,
            vat_amount: round2((total * VAT_RATE) / (100 + VAT_RATE)),
            payment_method: "cod",
            payment_status: "on_delivery",
            stock_reserved: false,
         });
      }
   }
   for (const [code, voucher] of Object.entries(vouchers)) set(`Vouchers/${code}`, { code, ...voucher, created_at: new Date(now - 200 * DAY) });
}

// --- store settings: only created when missing, never overwriting a store's own settings ---
const defaultSettings = {
   "Settings/Info": { store_name: "Demo Store", store_address: "1 Demo Street, Bucharest", phone_no: "+40 700 000 000", contact_mail: "contact@example.com", orders_mail: "orders@example.com", support_mail: "support@example.com" },
   "Settings/Shipping": { default_price: 25, enable_threshold: true, free_shipping_threshold: 500 },
   "Settings/Tax": { vat_rate: VAT_RATE },
   "Settings/Notifications": { send_new_order_mails: false, send_order_status_update_mails: false, send_confirmation_mails: false },
   "Settings/Payments": { cod_enabled: true, stripe_enabled: false, netopia_enabled: false, netopia_pos_signature: "", netopia_live: false },
};

// --- run ---
console.log(`Seeding ${emulator ? "the emulators" : `project ${projectId}`}: ${products.length} products, ${reviewCount} reviews${args["with-orders"] ? `, ${orderCount} orders` : ""}, ${uploads.length} images`);

let uploaded = 0;
const queue = [...uploads];
await Promise.all(
   Array.from({ length: 6 }, async () => {
      while (queue.length) {
         const { objectPath, render, contentType, token } = queue.shift();
         await bucket.file(objectPath).save(await render(), {
            resumable: false,
            metadata: { contentType, cacheControl: "public, max-age=31536000", metadata: { firebaseStorageDownloadTokens: token } },
         });
         if (++uploaded % 25 === 0 || uploaded === uploads.length) console.log(`uploaded ${uploaded}/${uploads.length} images`);
      }
   })
);

for (let i = 0; i < writes.length; i += 400) {
   const batch = db.batch();
   for (const [path, data] of writes.slice(i, i + 400)) batch.set(db.doc(path), data);
   await batch.commit();
}
console.log(`wrote ${writes.length} documents`);

for (const [path, data] of Object.entries(defaultSettings)) {
   const created = await db
      .doc(path)
      .create(data)
      .then(() => true)
      .catch((error) => {
         if (error.code === 6) return false; // ALREADY_EXISTS: keep the store's own settings
         throw error;
      });
   if (created) console.log(`created ${path}`);
}

// A verified admin account to sign in with, on the emulators only. Real stores create their admin with scripts/make-admin.mjs.
if (args["admin-email"]) {
   if (!emulator) throw new Error("--admin-email only works against the emulators; use scripts/make-admin.mjs for a real project.");
   const auth = getAuth();
   const password = typeof args["admin-password"] === "string" ? args["admin-password"] : randomBytes(9).toString("base64url");
   const existing = await auth.getUserByEmail(args["admin-email"]).catch(() => null);
   const user = existing ? await auth.updateUser(existing.uid, { password, emailVerified: true }) : await auth.createUser({ email: args["admin-email"], password, emailVerified: true, displayName: "Demo Admin" });
   await auth.setCustomUserClaims(user.uid, { isAdmin: true });
   await db.doc(`Users/${user.uid}`).set({ email: args["admin-email"], first_name: "Demo", last_name: "Admin", created_at: new Date(), demo: true }, { merge: true });
   console.log(`admin account: ${args["admin-email"]} / ${password} (emulators only)`);
}

console.log("done");
