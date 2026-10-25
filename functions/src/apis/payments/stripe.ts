import { CallableRequest, onCall, onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions/v2";
import Stripe from "stripe";
import { orderCurrency, stripeEventPaymentStatus, toMinorUnits } from "../../utils/payments";
import { loadStoreInfo } from "../../utils/settings";
import { enforceAppCheck } from "../../utils/params";
import { storeError } from "../../utils/errors";
import { applyPaymentStatus, db, payableOrder } from "./shared";

// Loaded only when ENABLE_STRIPE=true in functions/.env (see index.ts); set both secrets first:
// firebase functions:secrets:set STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

export const createStripeSession = onCall({ secrets: [stripeSecretKey], enforceAppCheck }, async (request: CallableRequest<{ orderId?: string; origin?: string }>) => {
   const { ref, order, orderId, origin } = await payableOrder(request, "stripe");
   const stripe = new Stripe(stripeSecretKey.value());
   const { store_name } = await loadStoreInfo();
   try {
      const session = await stripe.checkout.sessions.create({
         mode: "payment",
         client_reference_id: orderId,
         customer_email: order.email,
         metadata: { order_id: orderId },
         payment_intent_data: { metadata: { order_id: orderId } },
         // One line for the whole order: the total already includes vouchers and shipping
         line_items: [{ quantity: 1, price_data: { currency: orderCurrency(order).toLowerCase(), unit_amount: toMinorUnits(order.total), product_data: { name: `${store_name} #${orderId}` } } }],
         success_url: `${origin}/checkout/success?order=${encodeURIComponent(orderId)}&payment=stripe`,
         cancel_url: `${origin}/profile/orders/${encodeURIComponent(orderId)}?payment=cancelled`,
         expires_at: Math.floor(Date.now() / 1000) + 2 * 60 * 60,
      });
      await ref.update({ payment_status: "pending", payment_id: session.id });
      return { url: session.url };
   } catch (error) {
      logger.error(`[Payments] Stripe session for order ${orderId} failed:`, error);
      throw storeError("internal", "payment_start_failed");
   }
});

export const stripeWebhook = onRequest({ secrets: [stripeSecretKey, stripeWebhookSecret] }, async (req, res) => {
   const stripe = new Stripe(stripeSecretKey.value());
   let event: Stripe.Event;
   try {
      event = stripe.webhooks.constructEvent(req.rawBody, req.get("stripe-signature") ?? "", stripeWebhookSecret.value());
   } catch (error) {
      logger.warn("[Payments] Rejected a Stripe webhook with an invalid signature:", error);
      res.status(400).send("Invalid signature");
      return;
   }

   try {
      if (event.type.startsWith("checkout.session.")) {
         const session = event.data.object as Stripe.Checkout.Session;
         const next = stripeEventPaymentStatus(event.type, session.payment_status);
         const orderId = session.metadata?.order_id ?? session.client_reference_id;
         if (next && orderId) {
            await applyPaymentStatus(orderId, session.id, next, typeof session.payment_intent === "string" ? { payment_intent: session.payment_intent } : {});
         }
      } else if (event.type === "charge.refunded") {
         const charge = event.data.object as Stripe.Charge;
         const paymentIntent = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
         if (charge.refunded && paymentIntent) {
            const orders = await db.collection("Orders").where("payment_intent", "==", paymentIntent).limit(1).get();
            if (!orders.empty) await applyPaymentStatus(orders.docs[0].id, null, "refunded");
         }
      }
      res.json({ received: true });
   } catch (error) {
      // A 500 makes Stripe retry the event later
      logger.error(`[Payments] Failed to process Stripe event ${event.id}:`, error);
      res.status(500).send("Processing failed");
   }
});
