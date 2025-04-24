import { Notifications } from "@/types/user";
import { getNotifications } from "@/components/common/getProps";
import { cache } from "react";
// Default values
const DefaultNotifications: Notifications = {
   send_new_order_mails: process.env.NEXT_PUBLIC_SEND_NEW_ORDER_MAILS === "true",
   send_order_status_update_mails: process.env.NEXT_PUBLIC_SEND_ORDER_STATUS_UPDATE_MAILS === "true",
   send_confirmation_mails: process.env.NEXT_PUBLIC_SEND_CONFIRMATION_MAILS === "true",
};

// In-memory cache with stale-while-revalidate pattern
let cachedData: Notifications | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = (process.env.NEXT_PUBLIC_CACHE_DURATION ? parseInt(process.env.NEXT_PUBLIC_CACHE_DURATION) : 2) * 5 * 60 * 1000; // 10 minutes

async function fetchNotfData(): Promise<Notifications> {
   const now = Date.now();

   // Return cached data if it's still fresh
   if (cachedData && now - lastFetchTime < CACHE_DURATION) {
      return cachedData;
   }

   // Fetch new data
   const notifications = await fetchNotifications();

   // Update cache
   cachedData = notifications;
   lastFetchTime = now;

   return notifications;
}

async function fetchNotifications(): Promise<Notifications> {
   try {
      const notifications = await getNotifications();
      return notifications || DefaultNotifications;
   } catch (error) {
      console.error("Error fetching notifications:", error);
      return DefaultNotifications;
   }
}

export const getNotfData = cache(async (): Promise<Notifications> => {
   // This will only be called once per request due to React's cache
   const data = await fetchNotfData();
   return data;
});
