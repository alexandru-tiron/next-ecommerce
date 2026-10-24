import app from "@/lib/firebaseInit";
import { getFunctions, httpsCallable } from "firebase/functions";
import type { PaymentMethod } from "@core/payments";

// Payment rules shared with the Cloud Functions
export * from "@core/payments";

// Asks the server for the provider's payment page for an order and returns its URL
export async function startCardPayment(orderId: string, method: Exclude<PaymentMethod, "cod">) {
   const start = httpsCallable<{ orderId: string; origin: string }, { url: string }>(getFunctions(app, "europe-west3"), method === "stripe" ? "createStripeSession" : "createNetopiaPayment");
   const { data } = await start({ orderId, origin: window.location.origin });
   if (!data?.url) throw new Error("No payment URL");
   return data.url;
}
