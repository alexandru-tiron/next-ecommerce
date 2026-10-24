import { CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { siteUrl } from "../../utils/params";
import { paymentInputSchema } from "../../schemas";
import { parseInput } from "../../utils/validation";
import { cancelsOrder, isMethodEnabled, PaymentStatus, paymentSettingsFrom, safeReturnOrigin, shouldApplyPaymentStatus } from "../../utils/payments";

// Shared by the Stripe and NETOPIA modules. Those declare Secret Manager secrets, so index.ts only loads them once enabled.
export const db = getFirestore();

// Card orders not paid within this window are cancelled, which puts their items back in stock
const PAYMENT_WINDOW_MS = 3 * 60 * 60 * 1000;

export async function loadPaymentSettings() {
   return paymentSettingsFrom((await db.collection("Settings").doc("Payments").get()).data());
}

// Checks shared by both providers: the caller owns the order, it was placed for this method and still needs paying
export async function payableOrder(request: CallableRequest<{ orderId?: string; origin?: string }>, method: "stripe" | "netopia") {
   if (!request.auth) throw new HttpsError("unauthenticated", "Utilizatorul nu este autentificat.");
   const { orderId, origin } = parseInput(paymentInputSchema, request.data, "ID-ul comenzii este obligatoriu.");

   const ref = db.collection("Orders").doc(orderId);
   const snap = await ref.get();
   const order = snap.data();
   if (!order || order.user_id !== request.auth.uid) throw new HttpsError("not-found", "Comanda nu a fost găsită.");
   if (order.payment_method !== method) throw new HttpsError("failed-precondition", "Comanda a fost plasată cu altă metodă de plată.");
   if (order.status === "rejected") throw new HttpsError("failed-precondition", "Comanda a fost anulată.");
   if (order.payment_status === "paid" || order.payment_status === "refunded") throw new HttpsError("failed-precondition", "Comanda este deja plătită.");

   const settings = await loadPaymentSettings();
   if (!isMethodEnabled(method, settings)) throw new HttpsError("failed-precondition", "Metoda de plată nu este disponibilă momentan.");
   return { ref, order, orderId, settings, origin: safeReturnOrigin(origin, siteUrl.value()) };
}

// Applies a payment result to an order. Results for an older payment attempt, or that would move a paid order back, are ignored.
export async function applyPaymentStatus(orderId: string, paymentId: string | null, next: PaymentStatus, extra: Record<string, FieldValue | Partial<unknown> | undefined> = {}) {
   const ref = db.collection("Orders").doc(orderId);
   await db.runTransaction(async (transaction) => {
      const order = (await transaction.get(ref)).data();
      if (!order) {
         logger.warn(`[Payments] Order ${orderId} not found for payment update`);
         return;
      }
      if (paymentId && order.payment_id && order.payment_id !== paymentId) {
         logger.info(`[Payments] Ignoring ${next} for an older payment attempt on order ${orderId}`);
         return;
      }
      if (!shouldApplyPaymentStatus(order.payment_status, next)) return;

      const update: Record<string, FieldValue | Partial<unknown> | undefined> = { payment_status: next, payment_updated_at: FieldValue.serverTimestamp(), ...extra };
      // Cancelling triggers onOrderStatusChange, which releases the stock and e-mails the customer
      if (cancelsOrder(next) && (order.status ?? "pending") === "pending") update.status = "rejected";
      transaction.update(ref, update);
      logger.info(`[Payments] Order ${orderId}: payment ${order.payment_status ?? "-"} -> ${next}`);
   });
}

// Abandoned card payments: cancel orders still unpaid after the payment window
export const cancelUnpaidOrders = onSchedule("every 30 minutes", async () => {
   const pending = await db.collection("Orders").where("payment_status", "==", "pending").get();
   const cutoff = Date.now() - PAYMENT_WINDOW_MS;
   for (const order of pending.docs) {
      const date = order.data().date;
      if (date instanceof Timestamp && date.toMillis() < cutoff) {
         await applyPaymentStatus(order.id, null, "expired");
      }
   }
});
