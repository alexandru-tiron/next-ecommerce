import { logger } from "firebase-functions/v2";
import { orderCurrency } from "@core/payments";
import { inEmulator } from "./params";
import { loadEmailContext } from "../emails/context";
import { NotifiedStatus, orderStatusEmail } from "../emails/templates";
import { sendEmail } from "../emails/send";

export type { NotifiedStatus };

// Tells the customer their order was accepted, rejected, shipped or delivered, in the language they ordered in
export async function sendOrderStatusEmail(userEmail: string, orderId: string, order: { status: NotifiedStatus; first_name?: string; tracking_number?: string; currency?: string; locale?: string }) {
   if (inEmulator) return logger.info(`[Email] Status email for order ${orderId} skipped in the emulator`);
   const ctx = await loadEmailContext({ locale: order.locale, currency: orderCurrency(order) });
   await sendEmail({ to: userEmail, email: await orderStatusEmail(ctx, orderId, order.status, order.first_name, order.tracking_number), fromName: ctx.info.store_name, tag: "orders" });
   logger.info(`[Order] Sent "${order.status}" status e-mail for order ${orderId}`);
}
