// Cache tags for the store data server pages read (src/lib/server/storeData.ts).
// "catalog": products, categories and brands; "settings": store details, shipping, tax and slides.
export const STORE_TAGS = ["catalog", "settings"] as const;
export type StoreTag = (typeof STORE_TAGS)[number];

export const isStoreTag = (value: unknown): value is StoreTag => STORE_TAGS.includes(value as StoreTag);
