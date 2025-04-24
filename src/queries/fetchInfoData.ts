import { Info } from "@/types/user";
import { getInfo } from "@/components/common/getProps";
import { cache } from "react";
// Default values
const DefaultInfo: Info = {
   store_name: process.env.NEXT_PUBLIC_STORE_NAME || "Shop",
   store_address: process.env.NEXT_PUBLIC_STORE_ADDRESS || "Oltului 25, Galaţi, Romania",
   phone_no: process.env.NEXT_PUBLIC_PHONE_NO || "0722 222 222",
   contact_mail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@shop.ro",
   orders_mail: process.env.NEXT_PUBLIC_ORDERS_EMAIL || "orders@shop.ro",
   support_mail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@shop.ro",
};

// In-memory cache with stale-while-revalidate pattern
let cachedData: Info | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = (process.env.NEXT_PUBLIC_CACHE_DURATION ? parseInt(process.env.NEXT_PUBLIC_CACHE_DURATION) : 2) * 5 * 60 * 1000; // 10 minutes

async function fetchInfoData(): Promise<Info> {
   const now = Date.now();

   // Return cached data if it's still fresh
   if (cachedData && now - lastFetchTime < CACHE_DURATION) {
      return cachedData;
   }

   // Fetch new data
   const info = await fetchInfo();

   // Update cache
   cachedData = info;
   lastFetchTime = now;

   return info;
}

async function fetchInfo(): Promise<Info> {
   try {
      const info = await getInfo();
      return info || DefaultInfo;
   } catch (error) {
      console.error("Error fetching info:", error);
      return DefaultInfo;
   }
}

export const getInfoData = cache(async (): Promise<Info> => {
   // This will only be called once per request due to React's cache
   const data = await fetchInfoData();
   return data;
});
