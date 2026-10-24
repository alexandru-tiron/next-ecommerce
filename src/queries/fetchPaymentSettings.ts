import { db } from "@/lib/firebaseInit";
import { PaymentSettings, paymentSettingsFrom } from "@/lib/payments";
import { doc, getDoc } from "firebase/firestore";

// Read fresh each time: it decides which payment methods the checkout offers
export async function getPaymentSettings(): Promise<PaymentSettings> {
   try {
      return paymentSettingsFrom((await getDoc(doc(db, "Settings", "Payments"))).data());
   } catch (error) {
      console.error("Error fetching payment settings:", error);
      return paymentSettingsFrom(undefined);
   }
}
