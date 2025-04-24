import { db } from "@/lib/firebaseInit";
import { collection, getDocsFromCache, getDocsFromServer } from "firebase/firestore";
import { Brand } from "@/types/product";
import { cache } from "react";

// In-memory cache with stale-while-revalidate pattern
let cachedData: Brand[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = (process.env.NEXT_PUBLIC_CACHE_DURATION ? parseInt(process.env.NEXT_PUBLIC_CACHE_DURATION) : 2 )* 60 * 1000; // 2 minutes

async function fetchBrandData(): Promise<Brand[]> {
   const now = Date.now();

   // Return cached data if it's still fresh
   if (cachedData && now - lastFetchTime < CACHE_DURATION) {
      return cachedData;
   }

   // Fetch new data
   const brands = await fetchBrands();

   // Update cache
   cachedData = brands;
   lastFetchTime = now;

   return brands;
}


async function fetchBrands(): Promise<Brand[]> {
   try {
      // Try to get from Firestore cache first
      const querySnapshot = await getDocsFromCache(collection(db, "Brands")).then(
         (snap) => {
            if (snap.docs.length === 0) {
               return getDocsFromServer(collection(db, "Brands"));
            }
            return snap;
         }
      ).catch(() => getDocsFromServer(collection(db, "Brands")));

      const fetchPromises = querySnapshot.docs.map(async (item) => {
         return {
            id: item.id,
            name: item.data().name,
            image: item.data()?.image,
         } as Brand;
      });

      return await Promise.all(fetchPromises);
   } catch (error) {
      console.error("Error fetching brands:", error);
      return [];
   }
}
async function fetchBrandsFromFirestore(): Promise<Brand[]> {
    try {
       // Try to get from Firestore cache first
       const querySnapshot = await getDocsFromServer(collection(db, "Brands"));
 
       const fetchPromises = querySnapshot.docs.map(async (item) => {
          return {
             id: item.id,
             name: item.data().name,
             image: item.data()?.image,
          } as Brand;
       });
 
       return await Promise.all(fetchPromises);
    } catch (error) {
       console.error("Error fetching brands:", error);
       return [];
    }
 }

// Use React's cache function to memoize the result
export const getBrandData = cache(async (): Promise<Brand[]> => {
    // This will only be called once per request due to React's cache
    const data = await fetchBrandData();
    return data;
 });
 
 export const refreshBrandData = async (setBrands?: (brands: Brand[]) => void) => {
    const brands = await fetchBrandsFromFirestore();
    // Update cache
    cachedData = brands;
    lastFetchTime = Date.now();
    if (setBrands) setBrands(brands);
 };
