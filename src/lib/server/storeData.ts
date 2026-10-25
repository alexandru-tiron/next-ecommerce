import "server-only";
import { unstable_cache } from "next/cache";
import { DEFAULT_VAT_RATE, isValidVatRate } from "@core/vat";
import { Brand, Category, Product, Review, SkuVariant, Subcategory, Variant, VARIANT_TYPE } from "@/types/product";
import { Slide, Tax } from "@/types/user";
import {
   analyticsFrom,
   brandingFrom,
   DEFAULT_ANALYTICS,
   DEFAULT_BRANDING,
   DEFAULT_HOME,
   DEFAULT_LOCALIZATION,
   DEFAULT_NAVIGATION,
   DEFAULT_SHIPPING,
   DEFAULT_STORE_INFO,
   homeFrom,
   InfoPage,
   InfoPageId,
   infoPageFrom,
   localizationFrom,
   navigationFrom,
   shippingFrom,
   storeInfoFrom,
} from "@core/settings";
import type { ProductCardData } from "@/queries";
import type { StoreTag } from "@/lib/storeTags";
import { readCollection, readDoc, Row } from "./firestore";

// Store data for server-rendered pages, kept in Next's data cache. Admins' saves refresh it at once through
// /api/revalidate; otherwise it is re-read after `revalidate` seconds. Orders change product stock, so
// products refresh more often.
const SETTINGS_TTL = 300;
const CATALOG_TTL = 300;
const PRODUCT_TTL = 60;

const cached = <A extends unknown[], T>(load: (...args: A) => Promise<T>, key: string, tags: StoreTag[], revalidate: number) =>
   unstable_cache(load, [key], { tags, revalidate });

// Errors are caught outside the cache, so a failed read shows the defaults without being cached
async function safely<T>(what: string, fallback: T, load: () => Promise<T>): Promise<T> {
   try {
      return await load();
   } catch (error) {
      console.error(`Error loading ${what}:`, error);
      return fallback;
   }
}

// Settings (defaults and validation in packages/core/src/settings.ts)

const settingsDoc = <T>(path: string, from: (data: Record<string, unknown> | null) => T, key: string) =>
   cached(async () => from(await readDoc(path)), key, ["settings"], SETTINGS_TTL);

const loadInfo = settingsDoc("Settings/Info", storeInfoFrom, "info");
export const getInfoData = () => safely("store info", DEFAULT_STORE_INFO, loadInfo);

const loadShipping = settingsDoc("Settings/Shipping", shippingFrom, "shipping");
export const getShippData = () => safely("shipping settings", DEFAULT_SHIPPING, loadShipping);

const loadBranding = settingsDoc("Settings/Branding", brandingFrom, "branding");
export const getBranding = () => safely("branding", DEFAULT_BRANDING, loadBranding);

const loadLocalization = settingsDoc("Settings/Localization", localizationFrom, "localization");
export const getLocalization = () => safely("localization", DEFAULT_LOCALIZATION, loadLocalization);

const loadHomeLayout = settingsDoc("Settings/Home", homeFrom, "home");
export const getHomeLayout = () => safely("home layout", DEFAULT_HOME, loadHomeLayout);

const loadNavigation = settingsDoc("Settings/Navigation", navigationFrom, "navigation");
export const getNavigation = () => safely("navigation", DEFAULT_NAVIGATION, loadNavigation);

const loadAnalytics = settingsDoc("Settings/Analytics", analyticsFrom, "analytics");
export const getAnalytics = () => safely("analytics", DEFAULT_ANALYTICS, loadAnalytics);

// An information page as the store wrote it, per language. Languages it hasn't written show the built-in text.
const loadInfoPage = cached(async (id: InfoPageId) => infoPageFrom(await readDoc(`Settings/Legal/Pages/${id}`)), "info-page", ["settings"], SETTINGS_TTL);
export const getInfoPage = (id: InfoPageId) => safely("info page", { content: {} } as InfoPage, () => loadInfoPage(id));

const loadTax = cached(
   async (): Promise<Tax> => {
      const rate = (await readDoc("Settings/Tax"))?.vat_rate;
      return { vat_rate: isValidVatRate(rate) ? rate : DEFAULT_VAT_RATE };
   },
   "tax",
   ["settings"],
   SETTINGS_TTL
);
export const getTaxData = () => safely("tax settings", { vat_rate: DEFAULT_VAT_RATE }, loadTax);

const loadSlides = cached(
   async () => ((await readCollection("Settings/Info/Slider")) as unknown as Slide[]).sort((a, b) => a.order - b.order),
   "slides",
   ["settings"],
   SETTINGS_TTL
);
export const getSlides = () => safely("slides", [] as Slide[], loadSlides);

// Catalogue

const loadCategories = cached(
   async (): Promise<Category[]> => {
      const categories = await readCollection("Categories");
      return Promise.all(
         categories.map(async (category) => ({
            id: category.id,
            name: category.name as string,
            image: category.image as string | undefined,
            icon: category.icon as string,
            description: category.description as string | undefined,
            subcategories: (await readCollection(`Categories/${category.id}/Subcategories`)).map(
               (sub) => ({ id: sub.id, name: sub.name, icon: sub.icon, image: sub.image, description: sub.description }) as Subcategory
            ),
         }))
      );
   },
   "categories",
   ["catalog"],
   CATALOG_TTL
);
export const getCategData = () => safely("categories", [] as Category[], loadCategories);

const loadBrands = cached(
   async () => (await readCollection("Brands")).map((brand) => ({ id: brand.id, name: brand.name, image: brand.image }) as Brand),
   "brands",
   ["catalog"],
   CATALOG_TTL
);
export const getBrandData = () => safely("brands", [] as Brand[], loadBrands);

// Whole and decimal parts of a price, the way the price components show it
const priceParts = (value: unknown) => (typeof value === "number" ? value.toFixed(2).split(".").map(Number) : undefined);

type ProductOfTheMonth = { product: Product | null; price: { price: number[]; discount: number[] } };
const NO_PRODUCT_OF_THE_MONTH: ProductOfTheMonth = { product: null, price: { price: [0, 0], discount: [0, 0] } };

const loadProductOfTheMonth = cached(
   async (): Promise<ProductOfTheMonth> => {
      const [product] = await readCollection("Products", { where: [["product_of_month", "==", true]], limit: 1 });
      if (!product) return NO_PRODUCT_OF_THE_MONTH;
      const skuVariants = (await readCollection(`Products/${product.id}/SkuVariants`)) as unknown as SkuVariant[];
      // With SKU variants, the cheapest one sets the price
      const priced = skuVariants.length > 0 ? [...skuVariants].sort((a, b) => a.price - b.price)[0] : (product as unknown as SkuVariant);
      return {
         product: { ...product, sku_variants: skuVariants } as unknown as Product,
         price: { price: priceParts(priced.price) ?? [0, 0], discount: priceParts(priced.discount_price) as number[] },
      };
   },
   "product-of-the-month",
   ["catalog"],
   PRODUCT_TTL
);
export const getProductOfTheMonth = () => safely("product of the month", NO_PRODUCT_OF_THE_MONTH, loadProductOfTheMonth);

async function toCardData(product: Row): Promise<ProductCardData> {
   const skuVariants = await readCollection(`Products/${product.id}/SkuVariants`);
   return {
      id: product.id,
      name: product.name as string,
      brand: product.brand as string,
      short_description: product.short_description as string,
      product_images: (product.product_images as string[] | undefined) ?? [],
      price: product.price as number,
      discount_price: (product.discount_price as number | undefined) ?? undefined,
      sku_variants: skuVariants.map((sku) => ({ price: sku.price as number, discount_price: (sku.discount_price as number | undefined) ?? undefined })),
   };
}

// Products from the same subcategory, topped up from the same category when there aren't enough
const loadRelatedProducts = cached(
   async (product: Pick<Product, "id" | "subcategory_id" | "category_id">, max: number): Promise<ProductCardData[]> => {
      const related: Row[] = [];
      for (const [field, value] of [
         ["subcategory_id", product.subcategory_id],
         ["category_id", product.category_id],
      ] as const) {
         if (!value || related.length >= max) continue;
         for (const row of await readCollection("Products", { where: [[field, "==", value]], limit: max + 1 })) {
            if (related.length < max && row.id !== product.id && !related.some((item) => item.id === row.id)) related.push(row);
         }
      }
      return Promise.all(related.map(toCardData));
   },
   "related-products",
   ["catalog"],
   PRODUCT_TTL
);
export const getRelatedProducts = (product: Pick<Product, "id" | "subcategory_id" | "category_id">, max = 5) =>
   safely("related products", [] as ProductCardData[], () => loadRelatedProducts({ id: product.id, subcategory_id: product.subcategory_id, category_id: product.category_id }, max));

// A product with its variants. Media variants add their image to the product's gallery.
type ProductPage = { product: Product; variants: Variant[]; skuVariants: SkuVariant[] };
const loadProductPage = cached(
   async (id: string): Promise<ProductPage | null> => {
      const product = await readDoc(`Products/${id}`);
      if (!product) return null;
      const [variants, skuVariants] = await Promise.all([readCollection(`Products/${id}/Variants`), readCollection(`Products/${id}/SkuVariants`)]);
      const images = [...((product.product_images as string[] | undefined) ?? [])];
      for (const variant of variants) if (variant.media && variant.type === VARIANT_TYPE.MEDIA) images.push(variant.media as string);
      return {
         product: { ...product, product_images: images } as unknown as Product,
         variants: variants as unknown as Variant[],
         skuVariants: skuVariants as unknown as SkuVariant[],
      };
   },
   "product-page",
   ["catalog"],
   PRODUCT_TTL
);
export const getProductPage = (id: string) => safely("product", null, () => loadProductPage(id));

// Reviews aren't cached, so a customer sees their review as soon as they save it. Newest first.
export const getProductReviews = (id: string) =>
   safely("reviews", [] as Review[], async () =>
      ((await readCollection(`Products/${id}/Reviews`)) as unknown as Review[]).sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")))
   );

// Sitemap

type SitemapData = { products: { id: string; name: string; lastModified?: string }[]; categories: string[] };
const loadSitemapData = cached(
   async (): Promise<SitemapData> => {
      const [products, categories] = await Promise.all([readCollection("Products"), readCollection("Categories")]);
      return {
         products: products.map((product) => ({ id: product.id, name: product.name as string, lastModified: (product.updated_at ?? product.created_at) as string | undefined })),
         categories: categories.map((category) => category.name as string),
      };
   },
   "sitemap",
   ["catalog"],
   3600
);
export const getSitemapData = () => safely("sitemap", { products: [], categories: [] } as SitemapData, loadSitemapData);

