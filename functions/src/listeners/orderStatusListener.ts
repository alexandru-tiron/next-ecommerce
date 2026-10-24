import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import { NotifiedStatus, sendOrderStatusEmail } from "../utils/sendOrderStatusEmail";
import { restoreStock } from "../utils/stock";
import { emailPassword } from "../utils/params";

const NOTIFIED_STATUSES: NotifiedStatus[] = ["accepted", "rejected", "shipped", "delivered"];

// E-mails the customer when an admin changes an order's status, or adds the tracking number to a shipped order,
// and puts a rejected order's items back in stock.
// Controlled by the "send_order_status_update_mails" switch in Settings/Notifications.
export const onOrderStatusChange = onDocumentUpdated({ document: "Orders/{orderId}", secrets: [emailPassword] }, async (event) => {
   const before = event.data?.before.data();
   const after = event.data?.after.data();
   if (!before || !after) return;

   const statusChanged = before.status !== after.status;

   // A rejected order releases its stock
   if (statusChanged && after.status === "rejected") {
      try {
         await restoreStock(getFirestore(), event.data!.after.ref);
      } catch (error) {
         logger.error(`[Order] Failed to restore stock for order ${event.params.orderId}:`, error);
      }
   }

   const trackingAdded = after.status === "shipped" && !before.tracking_number && Boolean(after.tracking_number);
   if ((!statusChanged && !trackingAdded) || !NOTIFIED_STATUSES.includes(after.status)) return;

   const notifications = (await getFirestore().collection("Settings").doc("Notifications").get()).data();
   if (!notifications?.send_order_status_update_mails) {
      logger.info(`[Order] Status e-mail for order ${event.params.orderId} skipped based on settings`);
      return;
   }
   if (!after.email) {
      logger.warn(`[Order] Order ${event.params.orderId} has no e-mail address`);
      return;
   }

   try {
      await sendOrderStatusEmail(after.email, event.params.orderId, after as { status: NotifiedStatus; first_name?: string; tracking_number?: string });
   } catch (error) {
      logger.error(`[Order] Failed to send status e-mail for order ${event.params.orderId}:`, error);
   }
});
