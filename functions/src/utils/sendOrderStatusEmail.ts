import { logger } from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import { defineString } from "firebase-functions/params";
import { emailPassword, siteUrl } from "./params";
const nodemailer = require("nodemailer");

const emailUser = defineString("EMAIL_USER");

export type NotifiedStatus = "accepted" | "rejected" | "shipped" | "delivered";

const messages: Record<NotifiedStatus, { subject: (id: string) => string; title: string; body: string }> = {
   accepted: {
      subject: (id) => `Comanda #${id} a fost confirmată`,
      title: "Comanda ta a fost confirmată",
      body: "Am verificat comanda și o pregătim pentru expediere. Te anunțăm imediat ce coletul pleacă din depozit.",
   },
   rejected: {
      subject: (id) => `Comanda #${id} a fost anulată`,
      title: "Comanda ta a fost anulată",
      body: "Din păcate nu am putut procesa comanda. Dacă ai plătit deja, suma va fi returnată în contul tău. Contactează-ne pentru orice întrebare.",
   },
   shipped: {
      subject: (id) => `Comanda #${id} a fost expediată`,
      title: "Comanda ta este pe drum",
      body: "Coletul a fost predat curierului și ar trebui să ajungă la tine în 1-3 zile lucrătoare.",
   },
   delivered: {
      subject: (id) => `Comanda #${id} a fost livrată`,
      title: "Comanda ta a fost livrată",
      body: "Sperăm că te bucuri de produse! Ne-ar ajuta mult o recenzie pe pagina produsului.",
   },
};

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] as string);

export async function sendOrderStatusEmail(userEmail: string, orderId: string, order: { status: NotifiedStatus; first_name?: string; tracking_number?: string }) {
   const message = messages[order.status];
   const info = (await getFirestore().collection("Settings").doc("Info").get()).data();
   const storeName = escapeHtml(info?.store_name ?? "");
   const orderUrl = `${siteUrl.value().replace(/\/$/, "")}/profile/orders/${encodeURIComponent(orderId)}`;
   const user = emailUser.value();

   const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass: emailPassword.value() },
   });

   await transporter.sendMail({
      from: `"${info?.store_name ?? ""}" <${user.split("@")[0] + "+orders@" + user.split("@")[1]}>`,
      to: userEmail,
      subject: message.subject(orderId),
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f4fc; padding: 20px; text-align: center;">
          <h1 style="color: #d63384;">${message.title}</h1>
          <p>Comanda <strong>#${escapeHtml(orderId)}</strong></p>
        </div>
        <div style="padding: 20px;">
          <p>Bună${order.first_name ? ` ${escapeHtml(order.first_name)}` : ""},</p>
          <p>${message.body}</p>
          ${order.tracking_number && order.status !== "rejected" ? `<p><strong>Număr AWB:</strong> ${escapeHtml(order.tracking_number)}</p>` : ""}
          <p style="margin-top: 24px;"><a href="${orderUrl}" style="background-color: #d63384; color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none;">Vezi comanda</a></p>
          ${info?.support_mail ? `<p style="margin-top: 24px; color: #666;">Pentru întrebări ne poți scrie la <a href="mailto:${escapeHtml(info.support_mail)}" style="color: #d63384;">${escapeHtml(info.support_mail)}</a>${info.phone_no ? ` sau ne poți suna la <strong>${escapeHtml(info.phone_no)}</strong>` : ""}.</p>` : ""}
        </div>
        <div style="background-color: #f8f4fc; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          <p>© ${new Date().getFullYear()} ${storeName}. Toate drepturile rezervate.</p>
        </div>
      </div>`,
   });
   logger.info(`[Order] Sent "${order.status}" status e-mail for order ${orderId}`);
}
