import { db } from "@/lib/firebaseInit";
import { collection, getDocsFromCache, getDocsFromServer, query, where } from "firebase/firestore";
import { Product, SkuVariant } from "@/types/product";
import { cache } from "react";

// In-memory cache with stale-while-revalidate pattern
let cachedData: { product: Product | null; price: { price: number[]; discount: number[] } } | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = (process.env.NEXT_PUBLIC_CACHE_DURATION ? parseInt(process.env.NEXT_PUBLIC_CACHE_DURATION) : 2) * 60 * 1000; // 2 minutes

async function fetchProductOfTheMonth(): Promise<{ product: Product | null; price: { price: number[]; discount: number[] } }> {
   const now = Date.now();

   // Return cached data if it's still fresh
   if (cachedData && now - lastFetchTime < CACHE_DURATION) {
      return cachedData;
   }

   // Fetch new data
   const product = await fetchProduct();

   // Update cache
   cachedData = product;
   lastFetchTime = now;

   return product;
}

async function fetchProduct(): Promise<{ product: Product | null; price: { price: number[]; discount: number[] } }> {
   try {
      const productSnap = await getDocsFromCache(query(collection(db, "Products"), where("product_of_month", "==", true)))
         .then((snap) => {
            if (snap.docs.length === 0) {
               return getDocsFromServer(query(collection(db, "Products"), where("product_of_month", "==", true)));
            }
            return snap;
         })
         .catch(() => getDocsFromServer(query(collection(db, "Products"), where("product_of_month", "==", true))));
      if (productSnap.docs.length >= 1) {
         const skuVariantsSnap = await getDocsFromCache(query(collection(db, "Products", productSnap.docs[0].id, "SkuVariants")))
            .then((snap) => {
               if (snap.docs.length === 0) {
                  return getDocsFromServer(query(collection(db, "Products", productSnap.docs[0].id, "SkuVariants")));
               }
               return snap;
            })
            .catch(() => getDocsFromServer(query(collection(db, "Products", productSnap.docs[0].id, "SkuVariants"))));
         const product = { id: productSnap.docs[0].id, ...productSnap.docs[0].data(), sku_variants: skuVariantsSnap.docs.map((doc) => doc.data() as SkuVariant) } as Product;
         const productPrice =
            skuVariantsSnap.docs && skuVariantsSnap.docs.length > 0
               ? {
                    price: skuVariantsSnap.docs
                       .sort((a, b) => a.data().price - b.data().price)[0]
                       .data()
                       .price?.toFixed(2)
                       .split(".")
                       .map(Number) || [0, 0],
                    discount: skuVariantsSnap.docs
                       .sort((a, b) => a.data().price - b.data().price)[0]
                       .data()
                       .discount_price?.toFixed(2)
                       .split(".")
                       .map(Number),
                 }
               : {
                    price: productSnap.docs[0]?.data()?.price?.toFixed(2).split(".").map(Number) || [0, 0],
                    discount: productSnap.docs[0]?.data()?.discount_price?.toFixed(2)?.split(".")?.map(Number),
                 };

         return { product, price: productPrice };
      } else {
         return { product: null, price: { price: [0, 0], discount: [0, 0] } };
      }
   } catch (error) {
      console.error("Error fetching product of the month:", error);
      return { product: null, price: { price: [0, 0], discount: [0, 0] } };
   }
}

// Use React's cache function to memoize the result
export const getProductOfTheMonth = cache(async (): Promise<{ product: Product | null; price: { price: number[]; discount: number[] } }> => {
   // This will only be called once per request due to React's cache
   const data = await fetchProductOfTheMonth();
   return data;
});
