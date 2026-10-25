import { CallableRequest, onCall, onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions/v2";
import axios from "axios";
import { DEFAULT_VAT_RATE } from "../../utils/vat";
import { netopiaPaymentStatus, verifyNetopiaToken } from "../../utils/payments";
import { enforceAppCheck } from "../../utils/params";
import { storeError } from "../../utils/errors";
import { applyPaymentStatus, loadPaymentSettings, payableOrder } from "./shared";
import { loadLocalization, loadStoreInfo } from "../../utils/settings";

// Loaded only when ENABLE_NETOPIA=true in functions/.env (see index.ts); set both secrets first:
// firebase functions:secrets:set NETOPIA_API_KEY / NETOPIA_PUBLIC_KEY (the public certificate from the NETOPIA admin panel)
const netopiaApiKey = defineSecret("NETOPIA_API_KEY");
const netopiaPublicKey = defineSecret("NETOPIA_PUBLIC_KEY");

// Base URLs used by NETOPIA's official SDKs
const NETOPIA_API = { live: "https://secure.netopia-payments.com/api", sandbox: "https://secure.sandbox.netopia-payments.com" };
const ROMANIA_ISO_CODE = 642;

// Starts a payment on NETOPIA's hosted payment page (v2 API) and returns its URL
export const createNetopiaPayment = onCall({ secrets: [netopiaApiKey], enforceAppCheck }, async (request: CallableRequest<{ orderId?: string; origin?: string }>) => {
   const { ref, order, orderId, settings, origin } = await payableOrder(request, "netopia");
   const [{ store_name }, { default_locale }] = await Promise.all([loadStoreInfo(), loadLocalization()]);
   const description = `${store_name} #${orderId}`;
   // NETOPIA needs a new order reference for every attempt; the part before the last "_" is our order id
   const reference = `${orderId}_${Date.now().toString(36)}`;
   const address = order.billing_address ?? order.shipping_address ?? {};
   const contact = {
      email: order.email,
      phone: order.phone_no,
      firstName: order.first_name,
      lastName: order.last_name,
      city: address.city ?? "",
      country: ROMANIA_ISO_CODE,
      state: address.county ?? "",
      postalCode: String(address.postal_code ?? ""),
      details: [address.street, address.street_no].filter(Boolean).join(" "),
   };
   const body = {
      config: {
         emailTemplate: "",
         emailSubject: "",
         notifyUrl: `https://europe-west3-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/netopiaIpn`,
         redirectUrl: `${origin}/checkout/success?order=${encodeURIComponent(orderId)}&payment=netopia`,
         // NETOPIA's payment page is in Romanian or English
         language: default_locale === "ro" ? "ro" : "en",
      },
      payment: { options: { installments: 0, bonus: 0 }, data: {} },
      order: {
         ntpID: "",
         posSignature: settings.netopia_pos_signature,
         dateTime: new Date().toISOString(),
         description,
         orderID: reference,
         amount: order.total,
         // Only offered for orders in RON (see isMethodEnabled)
         currency: "RON",
         billing: contact,
         shipping: contact,
         // One line for the whole order, so the products add up to the amount (vouchers and shipping included)
         products: [{ name: description, code: orderId, category: "order", price: order.total, vat: order.vat_rate ?? DEFAULT_VAT_RATE }],
         installments: { selected: 0, available: [0] },
         data: { order_id: orderId },
      },
   };

   try {
      const { data } = await axios.post(`${settings.netopia_live ? NETOPIA_API.live : NETOPIA_API.sandbox}/payment/card/start`, body, {
         headers: { Authorization: netopiaApiKey.value(), "Content-Type": "application/json" },
         timeout: 20000,
      });
      const url = data?.payment?.paymentURL || data?.customerAction?.url;
      if (!url) {
         logger.error(`[Payments] NETOPIA returned no payment URL for order ${orderId}:`, data?.error);
         throw new Error("No payment URL");
      }
      await ref.update({ payment_status: "pending", payment_id: reference, ntp_id: data?.payment?.ntpID ?? null });
      return { url };
   } catch (error) {
      logger.error(`[Payments] NETOPIA payment for order ${orderId} failed:`, axios.isAxiosError(error) ? error.response?.data ?? error.message : error);
      throw storeError("internal", "payment_start_failed");
   }
});

// Payment notifications (IPN) from NETOPIA, verified with their Verification-token JWT
export const netopiaIpn = onRequest({ secrets: [netopiaPublicKey] }, async (req, res) => {
   if (req.method !== "POST") {
      res.status(405).end();
      return;
   }
   const settings = await loadPaymentSettings();
   const check = verifyNetopiaToken(req.get("Verification-token"), req.rawBody, netopiaPublicKey.value(), settings.netopia_pos_signature);
   if (!check.ok) {
      logger.warn(`[Payments] Rejected a NETOPIA IPN: ${check.reason}`);
      res.status(400).json({ errorType: 1, errorCode: "INVALID_TOKEN", errorMessage: check.reason });
      return;
   }

   try {
      const reference: string = req.body?.order?.orderID ?? "";
      const separator = reference.lastIndexOf("_");
      const orderId = separator > 0 ? reference.slice(0, separator) : reference;
      const statusCode = Number(req.body?.payment?.status);
      if (orderId && Number.isFinite(statusCode)) {
         await applyPaymentStatus(orderId, reference, netopiaPaymentStatus(statusCode), { ntp_id: req.body?.payment?.ntpID ?? null, netopia_status: statusCode });
      }
      res.status(200).json({ errorType: 0, errorCode: null, errorMessage: "" });
   } catch (error) {
      logger.error("[Payments] Failed to process a NETOPIA IPN:", error);
      res.status(500).json({ errorType: 1, errorCode: "PROCESSING_FAILED", errorMessage: "Temporary error" });
   }
});
