import { defineString } from "firebase-functions/params";
import { emailPassword } from "../utils/params";
import { RenderedEmail } from "./templates";
const nodemailer = require("nodemailer");

// Sends through the store's Gmail account (EMAIL_USER and the EMAIL_PASSWORD secret).
// A provider interface (Resend, SendGrid) replaces this in a later phase; see docs/ROADMAP.md.
export const emailUser = defineString("EMAIL_USER");

// "tag" uses Gmail's plus addressing, e.g. shop+orders@gmail.com, so replies can be filtered
const address = (tag?: string) => {
   const [name, domain] = emailUser.value().split("@");
   return tag ? `${name}+${tag}@${domain}` : `${name}@${domain}`;
};

export async function sendEmail({ to, email, fromName, tag, replyTo }: { to: string; email: RenderedEmail; fromName: string; tag?: string; replyTo?: string }) {
   const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: emailUser.value(), pass: emailPassword.value() } });
   await transporter.sendMail({
      // Quotes in the store name would break the header
      from: `"${fromName.replace(/["\\\r\n]/g, "")}" <${address(tag)}>`,
      to,
      replyTo,
      subject: email.subject,
      html: email.html,
      text: email.text,
   });
}

// The store's own inbox for order notifications
export const storeInbox = (ordersMail: string) => ordersMail || address();
