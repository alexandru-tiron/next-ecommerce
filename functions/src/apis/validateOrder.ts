import * as functions from "firebase-functions/v2";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { CallableRequest, onCall } from "firebase-functions/v2/https";
import {
   validateProducts,
   validateAddress,
   checkForDuplicateOrder,
} from "../utils/validateOrderDetails";
import { sendCustomerEmail, sendAdminEmail } from "../utils/sendNewOrderEmails";
import { reserveStock } from "../utils/stock";
import { orderInputMessage, orderInputSchema } from "../schemas";
import { parseInput } from "../utils/validation";
import { emailPassword, enforceAppCheck } from "../utils/params";
import { evaluateVoucher, normalizeVoucherCode, Voucher, voucherMessage } from "@core/voucher";
import { getVatRate, vatIncluded } from "../utils/vat";
import { isMethodEnabled, PAYMENT_METHODS, PaymentMethod, paymentSettingsFrom } from "../utils/payments";
import { Address, OrderData } from "../types/order";
import { getFirestore } from "firebase-admin/firestore";
const db = getFirestore();

// Rate limit settings
const MAX_CALLS_PER_USER = 3; // Maximum calls per time period per user
const TIME_PERIOD_MINUTES = 10; // Time period in minutes
const MAX_CALLS_PER_IP = 10; // Maximum calls per IP address in time period

// Function to validate and create order
export const validateAndCreateOrder = onCall(
   {
      concurrency: 50, // Increased to handle legitimate traffic
      timeoutSeconds: 60, // Set timeout
      maxInstances: 200, // Increased to handle spikes
      enforceAppCheck,
      secrets: [emailPassword],
      cors: true, // Enable CORS
   },
   async (request: CallableRequest<unknown>) => {
      // Check if user is authenticated
      if (!request.auth) {
         logger.warn(
            `Unauthenticated order attempt from IP: ${request.rawRequest?.ip || "unknown"}`
         );
         throw new functions.https.HttpsError(
            "unauthenticated",
            "Utilizatorul nu este autentificat."
         );
      } else if (!request.auth.token?.email_verified) {
         throw new functions.https.HttpsError(
            "unauthenticated",
            "Emailul tău nu a fost verificat. Vă rugăm să verificați emailul dvs. pentru a vă activa contul."
         );
      }

      try {
         const userId = request.auth.uid;
         // Checked before anything else: unknown fields are dropped and every value is bounded
         const orderData = parseInput(orderInputSchema, request.data, orderInputMessage);
         const ipAddress = request.rawRequest?.ip || undefined;

         logger.info(`[Order] Received order request from user ${userId} at IP ${ipAddress}`);

         // IP-based rate limiting\
         if (ipAddress) {
            const ipRateLimitRef = db
               .collection("RateLimits")
               .where("ip_address", "==", ipAddress)
               .where(
                  "date",
                  ">=",
                  Timestamp.fromDate(new Date(Date.now() - TIME_PERIOD_MINUTES * 60 * 1000))
               );
            const ipRateLimitDoc = await ipRateLimitRef.get();

            if (!ipRateLimitDoc.empty && ipRateLimitDoc.docs?.length >= MAX_CALLS_PER_IP) {
               // Rate limit exceeded
               logger.warn(`[Order] Rate limit exceeded for ${userId}`);
               throw new functions.https.HttpsError(
                  "resource-exhausted",
                  `Prea multe cereri de la această adresă IP. Încearcă din nou mai târziu.`
               );
            } else {
               await db.collection("RateLimits").doc().set({
                  ip_address: ipAddress,
                  date: FieldValue.serverTimestamp(),
               });
            }
         }
         // Check if an order with this idempotency key already exists (prevents race conditions)
         if (orderData.idempotency_key) {
            const existingOrderQuery = db
               .collection("Orders")
               .where("user_id", "==", userId)
               .where("idempotency_key", "==", orderData.idempotency_key)
               .limit(1);
            const existingOrderQuerySnapshot = await existingOrderQuery.get();
            if (!existingOrderQuerySnapshot.empty && existingOrderQuerySnapshot.docs?.length > 0) {
               // If exists, another parallel request already created the order
               throw new functions.https.HttpsError(
                  "already-exists",
                  "Comanda a fost deja plasată."
               );
            }
         }
         // User-based rate limiting
         const rateLimitRef = db
            .collection("Orders")
            .where("user_id", "==", userId)
            .where(
               "date",
               ">=",
               Timestamp.fromDate(new Date(Date.now() - TIME_PERIOD_MINUTES * 60 * 1000))
            );
         const rateLimitDoc = await rateLimitRef.get();

         if (!rateLimitDoc.empty && rateLimitDoc.docs?.length >= MAX_CALLS_PER_USER) {
            // Rate limit exceeded
            logger.warn(`[Order] Rate limit exceeded for ${userId}`);
            throw new functions.https.HttpsError(
               "resource-exhausted",
               `Prea multe comenzi într-o perioadă scurtă. Încearcă din nou după ${TIME_PERIOD_MINUTES} minute.`
            );
         }
         // Check if addresses exist - either via IDs or complete address objects
         let shippingAddress = orderData.shipping_address;
         let billingAddress = orderData.billing_address;

         // If we have address IDs but not the address objects, fetch them
         if (!shippingAddress && orderData.shipping_address_id) {
            const shippingAddressSnap = await db
               .doc(`Users/${userId}/Addresses/${orderData.shipping_address_id}`)
               .get();

            if (!shippingAddressSnap.exists) {
               logger.warn(`[Order] Shipping address not found for user ${userId}`);
               throw new functions.https.HttpsError(
                  "not-found",
                  "Adresa de livrare selectată nu există."
               );
            }

            shippingAddress = {
               id: shippingAddressSnap.id,
               ...shippingAddressSnap.data(),
            } as Address;
         } else if (!shippingAddress) {
            // Neither ID nor object provided
            logger.warn(`[Order] No shipping address provided for user ${userId}`);
            throw new functions.https.HttpsError("invalid-argument", "Adresa de livrare lipsește.");
         }

         if (!billingAddress && orderData.billing_address_id) {
            const billingAddressSnap = await db
               .doc(`Users/${userId}/Addresses/${orderData.billing_address_id}`)
               .get();

            if (!billingAddressSnap.exists) {
               logger.warn(`[Order] Billing address not found for user ${userId}`);
               throw new functions.https.HttpsError(
                  "not-found",
                  "Adresa de facturare selectată nu există."
               );
            }

            billingAddress = {
               id: billingAddressSnap.id,
               ...billingAddressSnap.data(),
            } as Address;
         } else if (!billingAddress) {
            // Neither ID nor object provided
            logger.warn(`[Order] No billing address provided for user ${userId}`);
            throw new functions.https.HttpsError(
               "invalid-argument",
               "Adresa de facturare lipsește."
            );
         }

         // Validate that addresses have all required fields
         if (!validateAddress(shippingAddress)) {
            logger.warn(`[Order] Invalid shipping address for user ${userId}`);
            throw new functions.https.HttpsError(
               "invalid-argument",
               "Adresa de livrare este incompletă sau invalidă."
            );
         }

         // For billing address, check if business flag is true
         const isBusinessOrder = orderData.is_business || false;

         if (!validateAddress(billingAddress, isBusinessOrder)) {
            if (isBusinessOrder) {
               logger.warn(`[Order] Invalid business billing address for user ${userId}`);
               throw new functions.https.HttpsError(
                  "invalid-argument",
                  "Adresa de facturare pentru firmă este incompletă sau invalidă. Verificați detaliile firmei."
               );
            } else {
               logger.warn(`[Order] Invalid billing address for user ${userId}`);
               throw new functions.https.HttpsError(
                  "invalid-argument",
                  "Adresa de facturare este incompletă sau invalidă."
               );
            }
         }

         // If this is a business order, validate the billing address is marked as a business address
         if (isBusinessOrder && !billingAddress.business) {
            logger.warn(`[Order] Non-business billing address used for business order ${userId}`);
            throw new functions.https.HttpsError(
               "invalid-argument",
               "Pentru comandă pe firmă, este necesară selectarea unei adrese de facturare de tip firmă."
            );
         }

         // Validate products
         const { validatedProducts, invalidProducts } = await validateProducts(
            orderData.products,
            userId
         );

         // If any products are invalid, return error
         if (invalidProducts?.length > 0) {
            logger.warn(`[Order] Invalid products in order from user ${userId}:`, invalidProducts);
            throw new functions.https.HttpsError(
               "aborted",
               "Unele produse din coș nu sunt valide."
            );
         }

         // Check for duplicate orders in the last hour
         const { isDuplicate, duplicateOrderId } = await checkForDuplicateOrder(
            userId,
            validatedProducts
         );
         if (isDuplicate) {
            logger.warn(`[Order] Duplicate order detected for user ${userId}`);
            return {
               status: 409, // Conflict
               success: false,
               error: "O comandă identică a fost deja plasată în ultimele 15 minute.",
               duplicateOrderId,
            };
         }

         // Calculate totals
         const subtotal = validatedProducts.reduce((sum, product) => {
            const price =
               product.discount && product.discount_price
                  ? product.discount_price
                  : product.product_price;
            return sum + price * product.quantity;
         }, 0);

         // Get shipping settings for free shipping threshold validation
         const shippingSettingsRef = await db.collection("Settings").doc("Shipping").get();
         const shippingSettings = shippingSettingsRef.data() || {
            default_price: 25,
            enable_threshold: false,
            free_shipping_threshold: 500,
         };

         // Shipping is what the store settings say, whatever the client sent: free above the threshold when it is enabled
         const validatedShippingPrice =
            shippingSettings.enable_threshold && subtotal >= shippingSettings.free_shipping_threshold ? 0 : shippingSettings.default_price;
         if (orderData.shipping_price !== validatedShippingPrice) {
            logger.warn(`[Order] Shipping price ${orderData.shipping_price} from user ${userId} corrected to ${validatedShippingPrice}`);
         }

         const total = subtotal + validatedShippingPrice;

         // Create order document
         const orderId = db.collection("Orders").doc().id;

         const orderToSave: OrderData = {
            user_id: userId,
            email: orderData.email,
            first_name: orderData.first_name,
            last_name: orderData.last_name,
            phone_no: orderData.phone_no,
            shipping_address_id: orderData.shipping_address_id || shippingAddress.id,
            billing_address_id: orderData.billing_address_id || billingAddress.id,
            shipping_address: shippingAddress, // Store complete shipping address
            billing_address: billingAddress, // Store complete billing address
            products: validatedProducts,
            shipping_price: validatedShippingPrice,
            total: Number.parseFloat(total.toFixed(2)),
            date: FieldValue.serverTimestamp() as Timestamp,
            status: "pending",
            is_business: isBusinessOrder,
            voucher: false,
         };
         const voucherCode = orderData.voucher && orderData.voucher_id ? normalizeVoucherCode(orderData.voucher_id) : null;
         const vatRate = await getVatRate();

         // Payment method: cash on delivery unless an enabled card provider was chosen
         const paymentMethod: PaymentMethod = PAYMENT_METHODS.includes(orderData.payment_method as PaymentMethod) ? (orderData.payment_method as PaymentMethod) : "cod";
         const paymentSettings = paymentSettingsFrom((await db.collection("Settings").doc("Payments").get()).data());
         if (!isMethodEnabled(paymentMethod, paymentSettings)) {
            throw new functions.https.HttpsError("failed-precondition", "Metoda de plată aleasă nu este disponibilă.");
         }
         orderToSave.payment_method = paymentMethod;
         orderToSave.payment_status = paymentMethod === "cod" ? "on_delivery" : "pending";
         // Use a transaction to ensure atomicity

         await db.runTransaction(async (transaction) => {
            // Transaction reads have to come before writes: voucher first, then stock
            let voucherDiscount = 0;
            const voucherRef = voucherCode ? db.collection("Vouchers").doc(voucherCode) : null;
            if (voucherRef) {
               const voucherSnap = await transaction.get(voucherRef);
               if (!voucherSnap.exists) {
                  throw new functions.https.HttpsError("invalid-argument", voucherMessage({ ok: false, reason: "not_found" }));
               }
               const check = evaluateVoucher(voucherSnap.data() as Voucher, subtotal);
               if (!check.ok) throw new functions.https.HttpsError("failed-precondition", voucherMessage(check));
               voucherDiscount = check.discount;
            }

            // Take the items out of stock
            await reserveStock(transaction, db, validatedProducts);

            if (voucherRef) {
               transaction.update(voucherRef, { uses: FieldValue.increment(1) });
               orderToSave.voucher = true;
               orderToSave.voucher_id = voucherCode!;
               orderToSave.voucher_discount = voucherDiscount;
               orderToSave.total = Number.parseFloat((subtotal - voucherDiscount + validatedShippingPrice).toFixed(2));
            }

            // Prices include VAT; keep the rate and amount with the order for invoices
            orderToSave.vat_rate = vatRate;
            orderToSave.vat_amount = vatIncluded(orderToSave.total, vatRate);

            // Create the order
            transaction.set(db.doc(`Orders/${orderId}`), {
               ...orderToSave,
               stock_reserved: true,
               idempotency_key: orderData.idempotency_key || null,
            });
         });

         // Get user data for email
         const userDoc = await db.doc(`Users/${userId}`).get();
         const userData = userDoc.data();

         const notificationsRef = await db.collection("Settings").doc(`Notifications`).get();
         const notificationsData = notificationsRef.data();
         if (userData && userData.email) {
            // Send confirmation email to customer
            notificationsData?.send_confirmation_mails
               ? await sendCustomerEmail(
                    userData.email,
                    orderId,
                    orderToSave,
                    notificationsData?.send_order_status_update_mails || false
                 )
               : logger.info(`[Order] Customer email notification skipped based on settings`);

            // Send notification email to admin
            notificationsData?.send_new_order_mails
               ? await sendAdminEmail(orderId, orderToSave, userData)
               : logger.info(`[Order] Admin email notification skipped based on settings`);
         }

         logger.info(`[Order] Successfully created order ${orderId} for user ${userId}`);
         return {
            status: 200, // OK
            success: true,
            orderId,
            message: "Comanda a fost creată cu succes.",
         };
      } catch (error: any) {
         logger.error(`[Order] Error processing order:`, error);

         // Validation errors already carry a message for the customer
         if (error instanceof functions.https.HttpsError) throw error;

         // Handle specific errors
         if (error.message === "DUPLICATE_ORDER") {
            // Find the duplicate order
            const duplicateOrderQuery = await db
               .collection("Orders")
               .where("user_id", "==", request.auth.uid)
               .where("idempotency_key", "==", (request.data as { idempotency_key?: string } | null)?.idempotency_key)
               .limit(1)
               .get();

            if (!duplicateOrderQuery.empty) {
               const duplicateOrder = duplicateOrderQuery.docs[0].data();
               logger.info(
                  `[Order] Duplicate order detected for idempotency key ${(request.data as { idempotency_key?: string } | null)?.idempotency_key}`
               );
               return {
                  status: 200, // OK
                  success: true,
                  orderId: duplicateOrder.id,
                  message: "Comanda existentă a fost returnată.",
                  is_duplicate: true,
               };
            }
         }

         throw new functions.https.HttpsError(
            "internal",
            "A apărut o eroare la procesarea comenzii. Te rugăm să încerci din nou."
         );
      }
   }
);
