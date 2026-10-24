import { createHash, createPublicKey, createVerify, KeyObject, X509Certificate } from "crypto";

export const PAYMENT_METHODS = ["cod", "stripe", "netopia"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
// "on_delivery" for cash on delivery; card payments go pending -> paid / failed / expired (-> refunded)
export type PaymentStatus = "on_delivery" | "pending" | "paid" | "failed" | "expired" | "refunded";

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

export function isMethodEnabled(method: PaymentMethod, settings: PaymentSettings) {
   if (method === "cod") return settings.cod_enabled;
   if (method === "stripe") return settings.stripe_enabled;
   return settings.netopia_enabled && settings.netopia_pos_signature !== "";
}

// Lei -> bani, as Stripe expects integer amounts in the smallest currency unit
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

const base64Url = (input: string) => Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");

function publicKeyFrom(pem: string): KeyObject {
   return pem.includes("BEGIN CERTIFICATE") ? new X509Certificate(pem).publicKey : createPublicKey(pem);
}

export type NetopiaTokenCheck = { ok: true } | { ok: false; reason: string };

// Verifies the Verification-token header NETOPIA sends with each IPN: an RSA-signed JWT whose issuer is
// "NETOPIA Payments", whose audience is our POS signature and whose `sub` is the base64 SHA-512 of the raw body
export function verifyNetopiaToken(token: string | undefined, rawBody: Buffer | string, publicKeyPem: string, posSignature: string, now = Date.now()): NetopiaTokenCheck {
   if (!token) return { ok: false, reason: "missing token" };
   const parts = token.split(".");
   if (parts.length !== 3) return { ok: false, reason: "malformed token" };
   const [headerPart, payloadPart, signaturePart] = parts;

   let header: { alg?: string };
   let claims: { iss?: string; aud?: string | string[]; sub?: string; exp?: number; nbf?: number };
   try {
      header = JSON.parse(base64Url(headerPart).toString("utf8"));
      claims = JSON.parse(base64Url(payloadPart).toString("utf8"));
   } catch {
      return { ok: false, reason: "malformed token" };
   }

   const bits = header.alg?.match(/^RS(256|384|512)$/)?.[1];
   if (!bits) return { ok: false, reason: `unexpected algorithm ${header.alg}` };
   const signatureValid = createVerify(`RSA-SHA${bits}`).update(`${headerPart}.${payloadPart}`).verify(publicKeyFrom(publicKeyPem), base64Url(signaturePart));
   if (!signatureValid) return { ok: false, reason: "invalid signature" };

   if (claims.iss !== "NETOPIA Payments") return { ok: false, reason: "invalid issuer" };
   const audience = Array.isArray(claims.aud) ? claims.aud[0] : claims.aud;
   if (!audience || audience !== posSignature) return { ok: false, reason: "invalid audience" };
   const seconds = Math.floor(now / 1000);
   if (typeof claims.exp === "number" && claims.exp < seconds) return { ok: false, reason: "token expired" };
   if (typeof claims.nbf === "number" && claims.nbf > seconds) return { ok: false, reason: "token not yet valid" };

   const bodyHash = createHash("sha512").update(rawBody).digest("base64");
   if (claims.sub !== bodyHash) return { ok: false, reason: "payload hash mismatch" };
   return { ok: true };
}

// Only send customers back to our own site (or a local dev server)
export function safeReturnOrigin(origin: unknown, siteUrl: string) {
   const site = siteUrl.replace(/\/$/, "");
   if (typeof origin !== "string") return site;
   if (origin === site || /^http:\/\/localhost(:\d+)?$/.test(origin)) return origin;
   return site;
}
