import app from "@/lib/firebaseInit";
import { getFunctions, httpsCallable } from "firebase/functions";

export type PaymentMethod = "cod" | "stripe" | "netopia";
export type PaymentStatus = "on_delivery" | "pending" | "paid" | "failed" | "expired" | "refunded";

// Settings/Payments: which methods customers can choose (card providers also need their secrets set on the server)
export type PaymentSettings = {
   cod_enabled: boolean;
   stripe_enabled: boolean;
   netopia_enabled: boolean;
   netopia_pos_signature: string;
   netopia_live: boolean;
};

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = { cod_enabled: true, stripe_enabled: false, netopia_enabled: false, netopia_pos_signature: "", netopia_live: false };

export function paymentSettingsFrom(data: Partial<PaymentSettings> | undefined): PaymentSettings {
   return {
      cod_enabled: data?.cod_enabled !== false,
      stripe_enabled: data?.stripe_enabled === true,
      netopia_enabled: data?.netopia_enabled === true,
      netopia_pos_signature: typeof data?.netopia_pos_signature === "string" ? data.netopia_pos_signature.trim() : "",
      netopia_live: data?.netopia_live === true,
   };
}

// Methods shown at checkout, in display order. Cash on delivery stays available if everything else is off.
export function availablePaymentMethods(settings: PaymentSettings): PaymentMethod[] {
   const methods: PaymentMethod[] = [];
   if (settings.cod_enabled) methods.push("cod");
   if (settings.stripe_enabled) methods.push("stripe");
   if (settings.netopia_enabled && settings.netopia_pos_signature) methods.push("netopia");
   return methods.length > 0 ? methods : ["cod"];
}

// Orders placed before card payments existed have no payment method: they were cash on delivery
export const orderPaymentMethod = (order: { payment_method?: PaymentMethod }): PaymentMethod => order.payment_method ?? "cod";

// A card order can still be paid while its payment is pending or failed and the order wasn't cancelled
export function canPayOrder(order: { payment_method?: PaymentMethod; payment_status?: PaymentStatus; status?: string }) {
   const method = orderPaymentMethod(order);
   return method !== "cod" && (order.payment_status === "pending" || order.payment_status === "failed") && order.status !== "rejected";
}

// Asks the server for the provider's payment page for an order and returns its URL
export async function startCardPayment(orderId: string, method: Exclude<PaymentMethod, "cod">) {
   const start = httpsCallable<{ orderId: string; origin: string }, { url: string }>(getFunctions(app, "europe-west3"), method === "stripe" ? "createStripeSession" : "createNetopiaPayment");
   const { data } = await start({ orderId, origin: window.location.origin });
   if (!data?.url) throw new Error("No payment URL");
   return data.url;
}
