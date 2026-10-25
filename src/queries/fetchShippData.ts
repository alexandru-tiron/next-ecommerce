import { Shipping } from "@/types/user";
import { getShipping } from "@/components/common/getProps";
import { DEFAULT_SHIPPING, shippingFrom } from "@core/settings";
import { cache } from "react";
// Defaults for a store that hasn't saved these settings yet
const DefaultShipping: Shipping = DEFAULT_SHIPPING;

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
      return shipping ? shippingFrom(shipping) : DefaultShipping;
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
