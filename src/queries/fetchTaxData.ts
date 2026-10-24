import { db } from "@/lib/firebaseInit";
import { DEFAULT_VAT_RATE, isValidVatRate } from "@/lib/vat";
import { Tax } from "@/types/user";
import { doc, getDoc } from "firebase/firestore";
import { cache } from "react";

// In-memory cache, like the other settings queries
let cachedData: Tax | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = (process.env.NEXT_PUBLIC_CACHE_DURATION ? parseInt(process.env.NEXT_PUBLIC_CACHE_DURATION) : 2) * 5 * 60 * 1000; // 10 minutes

async function fetchTaxData(): Promise<Tax> {
   if (cachedData && Date.now() - lastFetchTime < CACHE_DURATION) return cachedData;
   try {
      const rate = (await getDoc(doc(db, "Settings", "Tax"))).data()?.vat_rate;
      cachedData = { vat_rate: isValidVatRate(rate) ? rate : DEFAULT_VAT_RATE };
      lastFetchTime = Date.now();
      return cachedData;
   } catch (error) {
      console.error("Error fetching tax settings:", error);
      return { vat_rate: DEFAULT_VAT_RATE };
   }
}

export const getTaxData = cache(fetchTaxData);
