import { getFirestore } from "firebase-admin/firestore";
import { DEFAULT_VAT_RATE, isValidVatRate } from "@core/vat";

// The VAT rules are shared with the storefront (packages/core); reading the store's rate needs the Admin SDK
export { DEFAULT_VAT_RATE, vatIncluded } from "@core/vat";

export async function getVatRate() {
   const rate = (await getFirestore().collection("Settings").doc("Tax").get()).data()?.vat_rate;
   return isValidVatRate(rate) ? rate : DEFAULT_VAT_RATE;
}
