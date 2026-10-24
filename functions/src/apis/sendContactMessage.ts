import { createHash } from "crypto";
import { logger } from "firebase-functions/v2";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { contactMessageSchema } from "../schemas";
import { emailPassword, enforceAppCheck, inEmulator } from "../utils/params";
import { parseInput } from "../utils/validation";
const nodemailer = require("nodemailer");

const db = getFirestore();
const emailUser = defineString("EMAIL_USER");

// Messages one visitor can send per hour
const MAX_MESSAGES_PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] as string);

// Contact form and data-protection requests from the info pages. Visitors don't need an account.
// Each message is kept in ContactMessages (admins only) and e-mailed to the store's contact address.
export const sendContactMessage = onCall({ enforceAppCheck, secrets: [emailPassword], maxInstances: 10 }, async (request) => {
   const { website, ...message } = parseInput(contactMessageSchema, request.data, "Verifică datele din formular și încearcă din nou.");
   // Only bots fill in the hidden field; they get the usual answer and nothing is saved
   if (website) return { success: true };

   // Limited per visitor. The IP address is hashed, so it isn't stored.
   const visitor = createHash("sha256").update(request.rawRequest?.ip ?? "unknown").digest("hex").slice(0, 32);
   const limitRef = db.doc(`RateLimits/contact-${visitor}`);
   await db.runTransaction(async (transaction) => {
      const now = Date.now();
      const recent = ((await transaction.get(limitRef)).data()?.sent ?? []).filter((time: number) => time > now - HOUR_MS);
      if (recent.length >= MAX_MESSAGES_PER_HOUR) {
         throw new HttpsError("resource-exhausted", "Ai trimis prea multe mesaje. Încearcă din nou mai târziu.");
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
      const info = (await db.doc("Settings/Info").get()).data();
      const user = emailUser.value();
      const to = info?.contact_mail || user;
      const subject = message.type === "consent" ? "Cerere privind datele personale" : "Mesaj nou din formularul de contact";
      const name = escapeHtml(`${message.first_name} ${message.last_name}`);
      await nodemailer.createTransport({ service: "gmail", auth: { user, pass: emailPassword.value() } }).sendMail({
         from: `"${info?.store_name ?? ""}" <${user}>`,
         to,
         replyTo: message.email,
         subject: `${subject} – ${name}`,
         html: `
         <div style="font-family: Arial, sans-serif; max-width: 600px;">
           <h2>${subject}</h2>
           <p><strong>${name}</strong> &lt;${escapeHtml(message.email)}&gt;${message.phone ? `, ${escapeHtml(message.phone)}` : ""}</p>
           <p style="white-space: pre-wrap;">${escapeHtml(message.message)}</p>
           <p style="color: #666; font-size: 12px;">Răspunde direct la acest e-mail pentru a-i scrie clientului. Mesajul este salvat și în ContactMessages (${ref.id}).</p>
         </div>`,
      });
   } catch (error) {
      // The message is saved, so the visitor still gets a success answer
      logger.error(`[Email] Couldn't e-mail contact message ${ref.id}:`, error);
   }
   return { success: true };
});
