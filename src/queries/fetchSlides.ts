import { db } from "@/lib/firebaseInit";
import { collection, getDocsFromCache, getDocsFromServer } from "firebase/firestore";
import { cache } from "react";
import { Slide } from "@/types/user";

// In-memory cache with stale-while-revalidate pattern
let cachedData: Slide[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = (process.env.NEXT_PUBLIC_CACHE_DURATION ? parseInt(process.env.NEXT_PUBLIC_CACHE_DURATION) : 2) * 60 * 1000; // 2 minutes

async function fetchSlidesData(): Promise<Slide[]> {
   const now = Date.now();

   // Return cached data if it's still fresh
   if (cachedData && cachedData.length > 0 && now - lastFetchTime < CACHE_DURATION) {
      return cachedData;
   }

   // Fetch new data
   const slides = await fetchSlides();

   // Update cache
   cachedData = slides;
   lastFetchTime = now;

   return slides;
}

async function fetchSlides(): Promise<Slide[]> {
   try {
      // Try to get from Firestore cache first
      const slidesSnap = await getDocsFromCache(collection(db, "Settings", "Info", "Slider"))
         .then((snap) => {
            if (snap.docs.length === 0) {
               return getDocsFromServer(collection(db, "Settings", "Info", "Slider"));
            }
            return snap;
         })
         .catch(() => getDocsFromServer(collection(db, "Settings", "Info", "Slider")));
      const newSlides = slidesSnap.docs.map((doc) => doc.data() as Slide);
      return newSlides.sort((a, b) => a.order - b.order);
   } catch (error) {
      console.error("Error fetching brands:", error);
      return [];
   }
}

// Use React's cache function to memoize the result
export const getSlides = cache(async (): Promise<Slide[]> => {
   // This will only be called once per request due to React's cache
   const data = await fetchSlidesData();
   return data;
});
