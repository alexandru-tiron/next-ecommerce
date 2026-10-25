import { logger } from "firebase-functions/v2";
import { orderCurrency } from "@core/payments";
import { inEmulator } from "./params";
import { loadEmailContext } from "../emails/context";
import { EmailOrder, newOrderAdminEmail, orderConfirmationEmail } from "../emails/templates";
import { sendEmail, storeInbox } from "../emails/send";

type PlacedOrder = EmailOrder & { currency?: string; locale?: string };

// Order confirmation for the customer, in the language they ordered in. Failures are logged; the order stands.
export async function sendCustomerEmail(userEmail: string, orderId: string, order: PlacedOrder) {
   if (inEmulator) return logger.info(`[Email] Confirmation email for order ${orderId} skipped in the emulator`);
   try {
      const ctx = await loadEmailContext({ locale: order.locale, currency: orderCurrency(order) });
      await sendEmail({ to: userEmail, email: await orderConfirmationEmail(ctx, orderId, order), fromName: ctx.info.store_name, tag: "orders" });
      logger.info(`[Email] Confirmation email sent for order ${orderId}`);
   } catch (error) {
      logger.error(`[Email] Error sending customer email:`, error);
   }
}

// New-order notification for the store, in its default language
export async function sendAdminEmail(orderId: string, order: PlacedOrder) {
   if (inEmulator) return logger.info(`[Email] Admin notification for order ${orderId} skipped in the emulator`);
   try {
      const ctx = await loadEmailContext({ currency: orderCurrency(order) });
      await sendEmail({ to: storeInbox(ctx.info.orders_mail), email: await newOrderAdminEmail(ctx, orderId, order), fromName: ctx.info.store_name, tag: "orders", replyTo: order.email });
      logger.info(`[Email] Admin notification email sent for order ${orderId}`);
   } catch (error) {
      logger.error(`[Email] Error sending admin email:`, error);
   }
}
