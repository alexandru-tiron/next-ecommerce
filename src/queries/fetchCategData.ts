import { db } from "@/lib/firebaseInit";
import { collection, getDocsFromCache, getDocsFromServer } from "firebase/firestore";
import { Category, Subcategory } from "@/types/product";
import { cache } from "react";

// In-memory cache with stale-while-revalidate pattern
let cachedData: Category[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = (process.env.NEXT_PUBLIC_CACHE_DURATION ? parseInt(process.env.NEXT_PUBLIC_CACHE_DURATION) : 2) * 60 * 1000; // 2 minutes

async function fetchCategData(): Promise<Category[]> {
   const now = Date.now();
   // Return cached data if it's still fresh
   if (cachedData && now - lastFetchTime < CACHE_DURATION) {
      return cachedData;
   }
   // Fetch new data
   const categories = await fetchCategories();
   // Update cache
   cachedData = categories;
   lastFetchTime = now;

   return categories;
}

async function fetchCategories(): Promise<Category[]> {
   try {
      // Try to get from Firestore cache first
      const querySnapshot = await getDocsFromCache(collection(db, "Categories")).catch(() => getDocsFromServer(collection(db, "Categories")));

      const fetchPromises = querySnapshot.docs.map(async (item) => {
         // Try to get subcategories from cache first
         const querySub = await getDocsFromCache(collection(db, "Categories", item.id, "Subcategories")).catch(() => getDocsFromServer(collection(db, "Categories", item.id, "Subcategories")));

         const fetchPromisesSub = querySub.docs.map((item) => {
            return {
               id: item.id,
               name: item.data().name,
               icon: item.data().icon,
               image: item.data()?.image,
               description: item.data()?.description,
            } as Subcategory;
         });

         const subcategData = await Promise.all(fetchPromisesSub);
         return {
            id: item.id,
            name: item.data().name,
            image: item.data()?.image,
            icon: item.data()?.icon,
            description: item.data()?.description,
            subcategories: subcategData,
         } as Category;
      });

      return await Promise.all(fetchPromises);
   } catch (error) {
      console.error("Error fetching categories:", error);
      return [];
   }
}
async function fetchCategoriesFromFirestore(): Promise<Category[]> {
   try {
      // Try to get from Firestore cache first
      const querySnapshot = await getDocsFromServer(collection(db, "Categories"));

      const fetchPromises = querySnapshot.docs.map(async (item) => {
         // Try to get subcategories from cache first
         const querySub = await getDocsFromServer(collection(db, "Categories", item.id, "Subcategories"));

         const fetchPromisesSub = querySub.docs.map((item) => {
            return {
               id: item.id,
               name: item.data().name,
               icon: item.data().icon,
               image: item.data()?.image,
               description: item.data()?.description,
            } as Subcategory;
         });

         const subcategData = await Promise.all(fetchPromisesSub);
         return {
            id: item.id,
            name: item.data().name,
            image: item.data()?.image,
            icon: item.data()?.icon,
            description: item.data()?.description,
            subcategories: subcategData,
         } as Category;
      });

      return await Promise.all(fetchPromises);
   } catch (error) {
      console.error("Error fetching categories:", error);
      return [];
   }
}

export const getCategData = cache(async (): Promise<Category[]> => {
   // This will only be called once per request due to React's cache
   const data = await fetchCategData();
   return data;
});

export const refreshCategData = async (setCategories?: (categories: Category[]) => void) => {
   const categories = await fetchCategoriesFromFirestore();
   // Update cache
   cachedData = categories;
   lastFetchTime = Date.now();
   if (setCategories) setCategories(categories);
};

