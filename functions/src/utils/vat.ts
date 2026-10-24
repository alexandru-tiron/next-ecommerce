import { getFirestore } from "firebase-admin/firestore";

// Store prices include VAT. Romania's standard rate is 21% (since 1 August 2025); admins can change it in Settings/Tax.
export const DEFAULT_VAT_RATE = 21;

// The VAT contained in a VAT-inclusive amount, rounded to bani
export function vatIncluded(gross: number, rate: number) {
   if (!Number.isFinite(gross) || !Number.isFinite(rate) || rate <= 0) return 0;
   return Math.round(((gross * rate) / (100 + rate)) * 100) / 100;
}

export async function getVatRate() {
   const rate = (await getFirestore().collection("Settings").doc("Tax").get()).data()?.vat_rate;
   return typeof rate === "number" && rate >= 0 && rate <= 100 ? rate : DEFAULT_VAT_RATE;
}
