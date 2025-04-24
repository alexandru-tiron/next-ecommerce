import { Shipping } from "@/types/user";
import { getShipping } from "@/components/common/getProps";
import { cache } from "react";
// Default values
const DefaultShipping: Shipping = {
   default_price: Number(process.env.NEXT_PUBLIC_DEFAULT_SHIPPING_PRICE) || 25,
   enable_threshold: process.env.NEXT_PUBLIC_SHIPPING_THRESHOLD_ENABLED === "true",
   free_shipping_threshold: Number(process.env.NEXT_PUBLIC_SHIPPING_THRESHOLD) || 500,
};

// In-memory cache with stale-while-revalidate pattern
let cachedData: Shipping | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = (process.env.NEXT_PUBLIC_CACHE_DURATION ? parseInt(process.env.NEXT_PUBLIC_CACHE_DURATION) : 2) * 5 * 60 * 1000; // 10 minutes

 async function fetchShippData(): Promise<Shipping> {
   const now = Date.now();

   // Return cached data if it's still fresh
   if (cachedData && now - lastFetchTime < CACHE_DURATION) {
      return cachedData;
   }

   // Fetch new data
   const shipping = await fetchShipping();

   // Update cache
   cachedData = shipping;
   lastFetchTime = now;

   return shipping;
}

async function fetchShipping(): Promise<Shipping> {
   try {
      const shipping = await getShipping();
      return shipping || DefaultShipping;
   } catch (error) {
      console.error("Error fetching shipping:", error);
      return DefaultShipping;
   }
}

export const getShippData = cache(async (): Promise<Shipping> => {
   // This will only be called once per request due to React's cache
   const data = await fetchShippData();
   return data;
});
