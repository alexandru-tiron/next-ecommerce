import { readFileSync } from "node:fs";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { addDoc, collection, deleteDoc, deleteField, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let env: RulesTestEnvironment;

beforeAll(async () => {
   env = await initializeTestEnvironment({
      projectId: "demo-store",
      firestore: { rules: readFileSync("firestore.rules", "utf8") },
   });
});
afterAll(() => env.cleanup());
beforeEach(() => env.clearFirestore());

const anonymous = () => env.unauthenticatedContext().firestore();
const alice = (email = "alice@example.com") => env.authenticatedContext("alice", { email }).firestore();
const bob = () => env.authenticatedContext("bob", { email: "bob@example.com" }).firestore();
const admin = () => env.authenticatedContext("admin", { email: "admin@example.com", isAdmin: true }).firestore();

// Writes test data with the rules switched off
const seed = (path: string, data: Record<string, unknown>) => env.withSecurityRulesDisabled((context) => setDoc(doc(context.firestore(), path), data));

const address = { city: "Cluj-Napoca", county: "Cluj", street: "Str. Exemplu", street_no: 12, postal_code: "400001", business: false };
const cartItem = { product_id: "p1", product_name: "Headphones", product_code: "HP-1", product_image: "https://example.com/a.png", product_price: 199.99, quantity: 2 };

describe("catalogue and settings", () => {
   it("everyone can read the catalogue and store settings", async () => {
      await seed("Products/p1", { name: "Headphones" });
      await seed("Categories/c1", { name: "Audio" });
      await seed("Brands/b1", { name: "Acme" });
      await seed("Settings/Info", { store_name: "Shop" });
      for (const path of ["Products/p1", "Categories/c1", "Brands/b1", "Settings/Info"]) {
         await assertSucceeds(getDoc(doc(anonymous(), path)));
      }
   });

   it("only admins can change the catalogue and settings", async () => {
      for (const path of ["Products/p1", "Products/p1/SkuVariants/s1", "Categories/c1", "Brands/b1", "Settings/Info"]) {
         await assertFails(setDoc(doc(anonymous(), path), { name: "x" }));
         await assertFails(setDoc(doc(alice(), path), { name: "x" }));
         await assertSucceeds(setDoc(doc(admin(), path), { name: "x" }));
      }
   });

   it("vouchers are visible to admins only", async () => {
      await seed("Vouchers/SAVE10", { type: "percent", value: 10 });
      await assertFails(getDoc(doc(anonymous(), "Vouchers/SAVE10")));
      await assertFails(getDoc(doc(alice(), "Vouchers/SAVE10")));
      await assertSucceeds(getDoc(doc(admin(), "Vouchers/SAVE10")));
   });

   it("collections without a rule are closed, even to admins", async () => {
      await seed("DeletedUsers/alice", { email: "alice@example.com" });
      await assertFails(getDoc(doc(admin(), "DeletedUsers/alice")));
      await assertFails(setDoc(doc(admin(), "Anything/x"), { a: 1 }));
   });
});

describe("reviews", () => {
   const review = () => ({ uid: "alice", username: "Alice", stars: 5, review: "Great sound", date: serverTimestamp() });

   it("a customer can write one review under their own id", async () => {
      await assertSucceeds(setDoc(doc(alice(), "Products/p1/Reviews/alice"), review()));
      await assertSucceeds(deleteDoc(doc(alice(), "Products/p1/Reviews/alice")));
   });

   it("rejects reviews for someone else, invalid stars, extra fields and long text", async () => {
      await assertFails(setDoc(doc(alice(), "Products/p1/Reviews/bob"), { ...review(), uid: "bob" }));
      await assertFails(setDoc(doc(alice(), "Products/p1/Reviews/alice"), { ...review(), stars: 6 }));
      await assertFails(setDoc(doc(alice(), "Products/p1/Reviews/alice"), { ...review(), verified: true }));
      await assertFails(setDoc(doc(alice(), "Products/p1/Reviews/alice"), { ...review(), review: "x".repeat(1001) }));
      await assertFails(setDoc(doc(anonymous(), "Products/p1/Reviews/alice"), review()));
   });

   it("customers can't delete other people's reviews", async () => {
      await seed("Products/p1/Reviews/alice", { uid: "alice", stars: 5 });
      await assertFails(deleteDoc(doc(bob(), "Products/p1/Reviews/alice")));
   });
});

describe("user profiles", () => {
   it("only the user and admins can read a profile", async () => {
      await seed("Users/alice", { email: "alice@example.com" });
      await assertFails(getDoc(doc(anonymous(), "Users/alice")));
      await assertFails(getDoc(doc(bob(), "Users/alice")));
      await assertSucceeds(getDoc(doc(alice(), "Users/alice")));
      await assertSucceeds(getDoc(doc(admin(), "Users/alice")));
   });

   it("a new profile takes the sign-in e-mail and the server's time", async () => {
      await assertSucceeds(setDoc(doc(alice(), "Users/alice"), { email: "alice@example.com", created_at: serverTimestamp() }));
   });

   it("sign-up can save the name before the profile exists", async () => {
      await assertSucceeds(setDoc(doc(alice(), "Users/alice"), { first_name: "Alice", last_name: "Pop", phone_no: "0712345678" }, { merge: true }));
   });

   it("rejects new profiles with another e-mail, a made-up date, extra fields or for someone else", async () => {
      await assertFails(setDoc(doc(alice(), "Users/alice"), { email: "someone@example.com" }));
      await assertFails(setDoc(doc(alice(), "Users/alice"), { email: "alice@example.com", created_at: new Date("2020-01-01") }));
      await assertFails(setDoc(doc(alice(), "Users/alice"), { email: "alice@example.com", isAdmin: true }));
      await assertFails(setDoc(doc(bob(), "Users/alice"), { first_name: "Bob" }));
   });

   it("the user can edit their name, phone and default addresses", async () => {
      await seed("Users/alice", { email: "alice@example.com", created_at: new Date("2025-01-01"), shipping_address_id: "a1" });
      await assertSucceeds(updateDoc(doc(alice(), "Users/alice"), { first_name: "Alice", last_name: "Pop", phone_no: "0712345678" }));
      await assertSucceeds(updateDoc(doc(alice(), "Users/alice"), { billing_address_id: "a2" }));
      await assertSucceeds(updateDoc(doc(alice(), "Users/alice"), { shipping_address_id: deleteField() }));
   });

   it("created_at never changes and unknown fields can't be added", async () => {
      await seed("Users/alice", { email: "alice@example.com", created_at: new Date("2025-01-01") });
      await assertFails(updateDoc(doc(alice(), "Users/alice"), { created_at: new Date() }));
      await assertFails(updateDoc(doc(alice(), "Users/alice"), { isAdmin: true }));
      await assertFails(updateDoc(doc(alice(), "Users/alice"), { first_name: "x".repeat(101) }));
   });

   it("the e-mail only changes to the account's sign-in e-mail", async () => {
      await seed("Users/alice", { email: "alice@example.com" });
      await assertFails(updateDoc(doc(alice(), "Users/alice"), { email: "someone@example.com" }));
      await assertSucceeds(updateDoc(doc(alice("alice.new@example.com"), "Users/alice"), { email: "alice.new@example.com" }));
   });

   it("profiles written by older versions of the app can still be edited", async () => {
      await seed("Users/alice", { email: "alice@example.com", legacy_field: "kept" });
      await assertSucceeds(updateDoc(doc(alice(), "Users/alice"), { first_name: "Alice" }));
   });
});

describe("addresses", () => {
   it("the user can add, edit and delete their addresses", async () => {
      const ref = await assertSucceeds(addDoc(collection(alice(), "Users/alice/Addresses"), address));
      await assertSucceeds(updateDoc(doc(alice(), ref.path), { floor: "3", details: "Ring twice" }));
      await assertSucceeds(deleteDoc(doc(alice(), ref.path)));
   });

   it("accepts business addresses with company details", async () => {
      const business_details = { name: "Acme SRL", cui: "RO123456", reg_no: "J12/345/2020", iban: "RO49AAAA1B31007593840000" };
      await assertSucceeds(setDoc(doc(alice(), "Users/alice/Addresses/a1"), { ...address, business: true, business_details }));
   });

   it("rejects unknown fields, missing parts, oversized text and invalid company details", async () => {
      const path = "Users/alice/Addresses/a1";
      await assertFails(setDoc(doc(alice(), path), { ...address, owner: "bob" }));
      await assertFails(setDoc(doc(alice(), path), { county: "Cluj", street: "Str. Exemplu" }));
      await assertFails(setDoc(doc(alice(), path), { ...address, details: "x".repeat(501) }));
      await assertFails(setDoc(doc(alice(), path), { ...address, business: "yes" }));
      await assertFails(setDoc(doc(alice(), path), { ...address, business: true, business_details: { name: "Acme", script: "x" } }));
   });

   it("admins can read addresses but only the user can change them", async () => {
      await seed("Users/alice/Addresses/a1", address);
      await assertSucceeds(getDoc(doc(admin(), "Users/alice/Addresses/a1")));
      await assertFails(getDoc(doc(bob(), "Users/alice/Addresses/a1")));
      await assertFails(updateDoc(doc(bob(), "Users/alice/Addresses/a1"), { city: "Iași" }));
      await assertFails(updateDoc(doc(admin(), "Users/alice/Addresses/a1"), { city: "Iași" }));
   });
});

describe("cart", () => {
   it("the user can add items, change the quantity and remove them", async () => {
      await assertSucceeds(setDoc(doc(alice(), "Users/alice/Cart/i1"), { ...cartItem, sku_variant_id: "s1", sku_variant_name: "Black", discount: true, discount_price: 149 }));
      await assertSucceeds(updateDoc(doc(alice(), "Users/alice/Cart/i1"), { quantity: 5 }));
      await assertSucceeds(deleteDoc(doc(alice(), "Users/alice/Cart/i1")));
   });

   it("quantities must be whole numbers from 1 to 999", async () => {
      for (const quantity of [0, -1, 1.5, 1000, "2"]) {
         await assertFails(setDoc(doc(alice(), "Users/alice/Cart/i1"), { ...cartItem, quantity }));
      }
      await seed("Users/alice/Cart/i1", cartItem);
      await assertFails(updateDoc(doc(alice(), "Users/alice/Cart/i1"), { quantity: -3 }));
   });

   it("rejects items without a product or with unknown fields", async () => {
      const { product_id: _productId, ...withoutProduct } = cartItem;
      await assertFails(setDoc(doc(alice(), "Users/alice/Cart/i1"), withoutProduct));
      await assertFails(setDoc(doc(alice(), "Users/alice/Cart/i1"), { ...cartItem, total: 1 }));
   });

   it("other people can't see or change the cart", async () => {
      await seed("Users/alice/Cart/i1", cartItem);
      await assertFails(getDoc(doc(bob(), "Users/alice/Cart/i1")));
      await assertFails(setDoc(doc(bob(), "Users/alice/Cart/i2"), cartItem));
      await assertFails(getDoc(doc(anonymous(), "Users/alice/Cart/i1")));
   });
});

describe("wishlist", () => {
   it("the user can save and remove products", async () => {
      await assertSucceeds(setDoc(doc(alice(), "Users/alice/Wishlist/p1"), { added_at: serverTimestamp() }));
      await assertSucceeds(deleteDoc(doc(alice(), "Users/alice/Wishlist/p1")));
   });

   it("rejects extra fields, made-up dates and other people's lists", async () => {
      await assertFails(setDoc(doc(alice(), "Users/alice/Wishlist/p1"), { added_at: serverTimestamp(), note: "x" }));
      await assertFails(setDoc(doc(alice(), "Users/alice/Wishlist/p1"), { added_at: new Date("2020-01-01") }));
      await assertFails(setDoc(doc(bob(), "Users/alice/Wishlist/p1"), { added_at: serverTimestamp() }));
   });
});

describe("orders", () => {
   beforeEach(async () => {
      await seed("Orders/o1", { user_id: "alice", total: 100, status: "pending" });
      await seed("Orders/o2", { user_id: "bob", total: 50, status: "pending" });
   });

   it("customers read only their own orders", async () => {
      await assertSucceeds(getDoc(doc(alice(), "Orders/o1")));
      await assertSucceeds(getDocs(query(collection(alice(), "Orders"), where("user_id", "==", "alice"))));
      await assertFails(getDoc(doc(alice(), "Orders/o2")));
      await assertFails(getDocs(collection(alice(), "Orders")));
      await assertFails(getDoc(doc(anonymous(), "Orders/o1")));
   });

   it("customers can't create or change orders; only the order function creates them", async () => {
      await assertFails(setDoc(doc(alice(), "Orders/o3"), { user_id: "alice", total: 1 }));
      await assertFails(updateDoc(doc(alice(), "Orders/o1"), { status: "delivered", total: 1 }));
      await assertFails(deleteDoc(doc(alice(), "Orders/o1")));
   });

   it("admins read all orders and update them", async () => {
      await assertSucceeds(getDocs(collection(admin(), "Orders")));
      await assertSucceeds(updateDoc(doc(admin(), "Orders/o1"), { status: "accepted", tracking_number: "AWB123" }));
      await assertFails(setDoc(doc(admin(), "Orders/o3"), { user_id: "alice" }));
   });
});
