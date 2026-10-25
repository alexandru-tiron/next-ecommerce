export const PAYMENT_METHODS = ["cod", "stripe", "netopia"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
// "on_delivery" for cash on delivery; card payments go pending -> paid / failed / expired (-> refunded)
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

// NETOPIA only takes payments in RON
export function isMethodEnabled(method: PaymentMethod, settings: PaymentSettings, currency: string) {
   if (method === "cod") return settings.cod_enabled;
   if (method === "stripe") return settings.stripe_enabled;
   return settings.netopia_enabled && settings.netopia_pos_signature !== "" && currency === "RON";
}

// Methods shown at checkout, in display order. Cash on delivery stays available if everything else is off.
export function availablePaymentMethods(settings: PaymentSettings, currency: string): PaymentMethod[] {
   const methods = PAYMENT_METHODS.filter((method) => isMethodEnabled(method, settings, currency));
   return methods.length > 0 ? methods : ["cod"];
}

// Orders placed before the currency setting existed have no currency: the store they come from sold in RON
export const orderCurrency = (order: { currency?: string }) => order.currency ?? "RON";

// Orders placed before card payments existed have no payment method: they were cash on delivery
export const orderPaymentMethod = (order: { payment_method?: PaymentMethod }): PaymentMethod => order.payment_method ?? "cod";

// A card order can still be paid while its payment is pending or failed and the order wasn't cancelled
export function canPayOrder(order: { payment_method?: PaymentMethod; payment_status?: PaymentStatus; status?: string }) {
   const method = orderPaymentMethod(order);
   return method !== "cod" && (order.payment_status === "pending" || order.payment_status === "failed") && order.status !== "rejected";
}

// Amount in the smallest currency unit (cents), as Stripe expects. Every currency the store offers has two decimals for Stripe.
export const toMinorUnits = (amount: number) => Math.round(amount * 100);

// NETOPIA v2 payment status codes (from the official SDK): 3 paid, 5 confirmed, 8 credit (refund),
// 4 canceled, 11 error, 12 declined, 23 expired; everything else (new, opened, pending, 3-D Secure, fraud review...) is still pending
export function netopiaPaymentStatus(code: number): Exclude<PaymentStatus, "on_delivery"> {
   if (code === 3 || code === 5) return "paid";
   if (code === 8) return "refunded";
   if (code === 23) return "expired";
   if (code === 4 || code === 11 || code === 12) return "failed";
   return "pending";
}

// The order fields a Stripe webhook event changes, or null when the event doesn't affect the order
export function stripeEventPaymentStatus(type: string, sessionPaymentStatus?: string): Exclude<PaymentStatus, "on_delivery"> | null {
   switch (type) {
      case "checkout.session.completed":
         return sessionPaymentStatus === "paid" || sessionPaymentStatus === "no_payment_required" ? "paid" : "pending";
      case "checkout.session.async_payment_succeeded":
         return "paid";
      case "checkout.session.async_payment_failed":
         return "failed";
      case "checkout.session.expired":
         return "expired";
      default:
         return null;
   }
}

// An expired payment cancels the order, which releases its stock (see onOrderStatusChange).
// A declined card doesn't: the customer can try again from the order page until the payment window ends.
export const cancelsOrder = (status: PaymentStatus) => status === "expired";

// Payment status changes never move backwards from paid/refunded (webhooks can arrive out of order or twice)
export function shouldApplyPaymentStatus(current: PaymentStatus | undefined, next: PaymentStatus) {
   if (current === next) return false;
   if (current === "refunded") return false;
   if (current === "paid") return next === "refunded";
   return true;
}

// Only send customers back to our own site (or a local dev server)
export function safeReturnOrigin(origin: unknown, siteUrl: string) {
   const site = siteUrl.replace(/\/$/, "");
   if (typeof origin !== "string") return site;
   if (origin === site || /^http:\/\/localhost(:\d+)?$/.test(origin)) return origin;
   return site;
}
