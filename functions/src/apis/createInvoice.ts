import * as functions from "firebase-functions";
import { logger } from "firebase-functions/v2";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/https";
import axios from "axios";
import { OrderData } from "../types/order";
import { defineString, defineSecret } from "firebase-functions/params";
import { getVatRate, vatIncluded } from "../utils/vat";
import { enforceAppCheck } from "../utils/params";
import { orderIdInputSchema } from "../schemas";
import { parseInput } from "../utils/validation";
const db = getFirestore();
// Define parameters for Facturis API credentials
const facturisApiKey = defineSecret("FACTURIS_API_KEY");
const facturisUsername = defineString("FACTURIS_USERNAME");
const facturisPassword = defineSecret("FACTURIS_PASSWORD");
const facturisCUI = defineString("FACTURIS_CUI");

export const createInvoice = onCall(
   {
      enforceAppCheck,
      timeoutSeconds: 60,
      cors: false,
      concurrency: 5, // Increased to handle legitimate traffic
      maxInstances: 20, // Increased to handle spikes
      secrets: [facturisApiKey, facturisPassword],
   },
   async (request) => {
      try {
         // Check if user is authenticated
         if (!request.auth) {
            logger.warn(`Unauthenticated order attempt from IP: ${request.rawRequest?.ip || "unknown"}`);
            throw new functions.https.HttpsError("unauthenticated", "Utilizatorul nu este autentificat.");
         } else if (request.auth.token.isAdmin !== true) {
            throw new functions.https.HttpsError("permission-denied", "Nu aveți permisiune să accesați această funcție.");
         }

         const { orderId } = parseInput(orderIdInputSchema, request.data, "ID-ul comenzii este obligatoriu.");

         // Get Facturis API credentials
         const apiKey = facturisApiKey.value();
         const username = facturisUsername.value();
         const password = facturisPassword.value();
         const cui = facturisCUI.value();

         // Get order data from Firestore
         const orderDoc = await db.collection("Orders").doc(orderId).get();

         if (!orderDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Comanda nu a fost găsită.");
         }

         const order = orderDoc.data() as OrderData;
         // Use the VAT rate the order was placed with; older orders fall back to the current setting
         const vatRate = order.vat_rate ?? (await getVatRate());

         // Check if order is in a valid state to be invoiced
         if (order.status !== "accepted") {
            throw new functions.https.HttpsError("failed-precondition", "Doar comenzile acceptate pot fi facturate.");
         }

         // Check if the order already has an invoice
         if (order.invoice_id) {
            throw new functions.https.HttpsError("already-exists", "Comanda are deja o factură asociată.");
         }

         // Format date in the expected format: YYYY-MM-DD HH:MM:SS
         const currentDate = new Date();
         const formattedDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")} ${String(currentDate.getHours()).padStart(2, "0")}:${String(currentDate.getMinutes()).padStart(2, "0")}:${String(
            currentDate.getSeconds()
         ).padStart(2, "0")}`;

         // Calculate due date (30 days from now)
         const dueDate = new Date(currentDate);
         dueDate.setDate(dueDate.getDate() + 30);
         const formattedDueDate = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`;

         // Prepare invoice details (dataFact)
         const dataFact = {
            facturi_key: "",
            facturi_punct_de_lucru: "",
            facturi_gestiune: "",
            facturi_data: formattedDate,
            facturi_data_scadenta: formattedDueDate,
            facturi_serie: "ONLINE", // You might want to make this configurable
            facturi_numar: "",
            facturi_cota_tva: `${vatRate}%`,
            facturi_moneda: "RON",
            facturi_nume_client: `${order.first_name} ${order.last_name}`,
            facturi_tip_persoana: order.is_business ? "juridica" : "fizica", // "juridica" for companies, "fizica" for individuals
            facturi_codf_client: order.is_business ? order.billing_address.business_details?.cui || "" : "",
            facturi_nrreg_client: order.is_business ? order.billing_address.business_details?.reg_no || "" : "",
            facturi_sediu_client: `${order.billing_address.street} ${order.billing_address.street_no}${order.billing_address.apartment ? ", ap. " + order.billing_address.apartment : ""}`,
            facturi_judet_client: order.billing_address.county,
            facturi_oras_client: order.billing_address.city,
            facturi_tara_client: "Romania",
            facturi_cont_client: order.is_business ? order.billing_address.business_details?.iban || "" : "",
            facturi_banca_client: order.is_business ? order.billing_address.business_details?.bank || "" : "",
            facturi_clienti_adresa_livrare: `${order.shipping_address.street} ${order.shipping_address.street_no}${order.shipping_address.apartment ? ", ap. " + order.shipping_address.apartment : ""}`,
            facturi_clienti_judet_livrare: order.shipping_address.county,
            facturi_clienti_oras_livrare: order.shipping_address.city,
            facturi_clienti_tel: order.phone_no,
            facturi_obs_client: "",
            facturi_nume_delegat: "",
            facturi_act_delegat: "",
            facturi_obs_delegat: "",
            facturi_obs_up: `Comandă online #${orderId}`,
            facturi_status: "Emisa",
            fk_agent_name: "",
            incasare_factura: "Chitanta",
            chitanta_serie: "",
         };

         // Prepare products data (dataProd)
         const dataProd = order.products.map((product) => {
            // Calculate prices
            const priceWithVat = product.discount && product.discount_price ? product.discount_price : product.product_price;
            // Prices include VAT, so the VAT is the part of the price above the net value
            const priceWithoutVat = priceWithVat - vatIncluded(priceWithVat, vatRate);
            const totalPriceWithVat = priceWithVat * product.quantity;
            const vatTotalValue = vatIncluded(totalPriceWithVat, vatRate);
            const totalPriceWithoutVat = totalPriceWithVat - vatTotalValue;

            return {
               facturi_prod_nume: product.product_name + (product.variant_name ? ` - ${product.variant_name}` : "") + (product.sku_variant_name ? ` (${product.sku_variant_name})` : ""),
               facturi_prod_moneda: "RON",
               facturi_prod_pretftva: priceWithoutVat.toFixed(2),
               facturi_prod_pretctva: priceWithVat.toFixed(2),
               facturi_prod_cant: product.quantity.toFixed(0),
               facturi_prod_val: totalPriceWithoutVat.toFixed(2),
               facturi_prod_val_tva: vatTotalValue.toFixed(2),
               facturi_prod_val_tot: totalPriceWithVat.toFixed(2),
               prod_cod: product.product_code || "-",
               prod_sku: "-",
               prod_cod1: "-",
               prod_cod_cautare: "prod_cod",
               facturi_prod_tva: `${vatRate}%`,
            };
         });

         // Add shipping as a product if there's a shipping cost
         if (order.shipping_price > 0) {
            const shippingVat = vatIncluded(order.shipping_price, vatRate);
            const shippingWithoutVat = order.shipping_price - shippingVat;

            dataProd.push({
               facturi_prod_nume: "Transport",
               facturi_prod_moneda: "RON",
               facturi_prod_pretftva: shippingWithoutVat.toFixed(2),
               facturi_prod_pretctva: order.shipping_price.toFixed(2),
               facturi_prod_cant: "1.000",
               facturi_prod_val: shippingWithoutVat.toFixed(2),
               facturi_prod_val_tva: shippingVat.toFixed(2),
               facturi_prod_val_tot: order.shipping_price.toFixed(2),
               prod_cod: "-",
               prod_sku: "-",
               prod_cod1: "-",
               prod_cod_cautare: "prod_cod",
               facturi_prod_tva: `${vatRate}%`,
            });
         }

         // A voucher is invoiced as a negative line so the invoice total matches what the customer paid
         if (order.voucher_discount && order.voucher_discount > 0) {
            const discountVat = vatIncluded(order.voucher_discount, vatRate);
            dataProd.push({
               facturi_prod_nume: `Discount voucher ${order.voucher_id ?? ""}`.trim(),
               facturi_prod_moneda: "RON",
               facturi_prod_pretftva: (-(order.voucher_discount - discountVat)).toFixed(2),
               facturi_prod_pretctva: (-order.voucher_discount).toFixed(2),
               facturi_prod_cant: "1.000",
               facturi_prod_val: (-(order.voucher_discount - discountVat)).toFixed(2),
               facturi_prod_val_tva: (-discountVat).toFixed(2),
               facturi_prod_val_tot: (-order.voucher_discount).toFixed(2),
               prod_cod: "-",
               prod_sku: "-",
               prod_cod1: "-",
               prod_cod_cautare: "prod_cod",
               facturi_prod_tva: `${vatRate}%`,
            });
         }

         // Prepare the main request payload for Facturis API
         const facturisPayload = {
            APIkey: apiKey,
            u: username,
            p: password,
            c: cui,
            met: "Facturi",
            act: "Ins",
            dataFact: dataFact,
            dataProd: dataProd,
         };

         // Call the Facturis API to create the invoice
         logger.info(`[Facturis] Sending invoice request for order ${orderId} (${dataProd.length} lines)`);

         const facturisResponse = await axios.post("https://api.facturis-online.ro/api/", `json=${JSON.stringify(facturisPayload)}`, {
            headers: {
               "Content-Type": "application/x-www-form-urlencoded",
            },
         });

         // Process the response
         const responseData = facturisResponse.data;

         if (responseData.success !== 2000) {
            logger.error(`[Facturis] Error creating invoice for order ${orderId}:`, { success: responseData.success, result: responseData.result });
            throw new functions.https.HttpsError("internal", "Eroare la crearea facturii: " + (responseData.result || "Eroare necunoscută"));
         }

         // Extract invoice details from the response
         const invoiceId = responseData.result.facturi_key;
         const invoiceNumber = responseData.result.facturi_serie_numar;
         const invoiceUrl = responseData.result.facturi_url || "";

         // Update the order with invoice information
         await db.collection("Orders").doc(orderId).update({
            invoice_id: invoiceId,
            invoice_number: invoiceNumber,
            invoice_url: invoiceUrl,
            invoice_date: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp(),
         });

         logger.info(`[Facturis] Successfully created invoice ${invoiceNumber} for order ${orderId}`);

         return {
            success: true,
            invoice_id: invoiceId,
            invoice_number: invoiceNumber,
            invoice_url: invoiceUrl,
         };
      } catch (error: any) {
         logger.error("[Facturis] Error in createInvoice:", error);

         if (error instanceof functions.https.HttpsError) {
            throw error;
         }

         throw new functions.https.HttpsError("internal", `Eroare la crearea facturii: ${error.message || "Eroare necunoscută"}`);
      }
   }
);
