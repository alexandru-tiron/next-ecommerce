import { createHash } from "crypto";
import { logger } from "firebase-functions/v2";
import { onCall } from "firebase-functions/v2/https";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { contactMessageSchema } from "../schemas";
import { emailPassword, enforceAppCheck, inEmulator } from "../utils/params";
import { parseInput } from "../utils/validation";
import { storeError } from "../utils/errors";
import { loadEmailContext } from "../emails/context";
import { contactMessageEmail } from "../emails/templates";
import { sendEmail, storeInbox } from "../emails/send";

const db = getFirestore();

// Messages one visitor can send per hour
const MAX_MESSAGES_PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;

// Contact form and data-protection requests from the info pages. Visitors don't need an account.
// Each message is kept in ContactMessages (admins only) and e-mailed to the store's contact address.
export const sendContactMessage = onCall({ enforceAppCheck, secrets: [emailPassword], maxInstances: 10 }, async (request) => {
   const { website, ...message } = parseInput(contactMessageSchema, request.data);
   // Only bots fill in the hidden field; they get the usual answer and nothing is saved
   if (website) return { success: true };

   // Limited per visitor. The IP address is hashed, so it isn't stored.
   const visitor = createHash("sha256").update(request.rawRequest?.ip ?? "unknown").digest("hex").slice(0, 32);
   const limitRef = db.doc(`RateLimits/contact-${visitor}`);
   await db.runTransaction(async (transaction) => {
      const now = Date.now();
      const recent = ((await transaction.get(limitRef)).data()?.sent ?? []).filter((time: number) => time > now - HOUR_MS);
      if (recent.length >= MAX_MESSAGES_PER_HOUR) {
         throw storeError("resource-exhausted", "too_many_messages");
      }
      transaction.set(limitRef, { sent: [...recent, now], expires_at: Timestamp.fromMillis(now + HOUR_MS) });
   });

   const ref = await db.collection("ContactMessages").add({ ...message, phone: message.phone || null, created_at: FieldValue.serverTimestamp(), read: false });
   logger.info(`[Contact] Saved ${message.type} message ${ref.id}`);

   if (inEmulator) {
      logger.info(`[Email] Contact message ${ref.id} not e-mailed in the emulator`);
      return { success: true };
   }

   try {
      // In the store's default language, to the contact address (or the sending account when there is none)
      const ctx = await loadEmailContext();
      const email = await contactMessageEmail(ctx, ref.id, message);
      await sendEmail({ to: storeInbox(ctx.info.contact_mail || ctx.info.support_mail), email, fromName: ctx.info.store_name, replyTo: message.email });
   } catch (error) {
      // The message is saved, so the visitor still gets a success answer
      logger.error(`[Email] Couldn't e-mail contact message ${ref.id}:`, error);
   }
   return { success: true };
});
