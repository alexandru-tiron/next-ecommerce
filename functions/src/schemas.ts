import { z } from "zod";
import { MAX_LINE_QUANTITY, MAX_ORDER_LINES } from "@core/orderLimits";
import { PAYMENT_METHODS } from "@core/payments";
import { validateEmail, validateName, validatePhone } from "@core/validators";
import { docId } from "./utils/validation";

// Input schemas for the callable functions. Lengths match the limits in firestore.rules.

const text = (max: number) => z.string().trim().max(max);
// Address forms save these as text or as a number
const shortValue = z.union([text(20), z.number().finite()]);

const addressSchema = z.object({
   id: docId.optional(),
   city: text(100).min(1),
   county: text(100).min(1),
   street: text(200).min(1),
   street_no: shortValue,
   postal_code: shortValue,
   apartment: shortValue.optional(),
   building: shortValue.optional(),
   building_no: shortValue.optional(),
   floor: shortValue.optional(),
   intercom: shortValue.optional(),
   details: text(500).optional(),
   business: z.boolean().optional(),
   business_details: z
      .object({
         name: text(200),
         cui: text(20),
         reg_no: text(40),
         bank: text(100).optional(),
         iban: text(34).optional(),
      })
      .optional(),
});

// Prices and names here are only the customer's view: the order function re-reads all of them from the catalogue
const cartProductSchema = z.object({
   id: z.string().max(128),
   product_id: docId,
   product_name: text(300),
   product_code: text(100),
   product_image: z.string().max(2048),
   product_price: z.number().finite().nonnegative(),
   discount: z.boolean().optional(),
   discount_price: z.number().finite().nonnegative().optional(),
   quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
   variant_id: docId.optional(),
   variant_name: text(200).optional(),
   sku_variant_id: docId.optional(),
   sku_variant_name: text(200).optional(),
});

export const orderInputSchema = z.object({
   first_name: z.string().max(100).refine(validateName),
   last_name: z.string().max(100).refine(validateName),
   email: z.string().max(254).refine(validateEmail),
   phone_no: z.string().max(30).refine(validatePhone),
   shipping_address_id: docId.optional(),
   billing_address_id: docId.optional(),
   shipping_address: addressSchema.optional(),
   billing_address: addressSchema.optional(),
   is_business: z.boolean().optional(),
   voucher: z.boolean().optional(),
   voucher_id: text(64).optional(),
   payment_method: z.enum(PAYMENT_METHODS).optional(),
   products: z.array(cartProductSchema).min(1).max(MAX_ORDER_LINES),
   shipping_price: z.number().finite().optional(),
   total: z.number().finite().optional(),
   idempotency_key: z.string().max(200).optional(),
});

export type OrderInput = z.infer<typeof orderInputSchema>;

// Customer-facing message for the first invalid field of an order (Romanian, like the other order errors)
export function orderInputMessage(field: PropertyKey | undefined) {
   switch (field) {
      case "first_name":
         return "Prenumele tău este invalid.";
      case "last_name":
         return "Numele tău este invalid.";
      case "email":
         return "Emailul tău este invalid.";
      case "phone_no":
         return "Numărul de telefon este invalid.";
      case "shipping_address":
      case "shipping_address_id":
         return "Adresa de livrare este incompletă sau invalidă.";
      case "billing_address":
      case "billing_address_id":
         return "Adresa de facturare este incompletă sau invalidă.";
      default:
         return "Datele comenzii sunt invalide sau lipsesc.";
   }
}

export const voucherInputSchema = z.object({
   code: z.string().max(64),
   subtotal: z.number().finite().nonnegative(),
});

export const orderIdInputSchema = z.object({ orderId: docId });

export const paymentInputSchema = z.object({ orderId: docId, origin: z.string().max(200).optional() });

export const adminPrivilegeInputSchema = z.object({ uid: z.string().min(1).max(128) });

// The contact form and the data-protection request form. "website" is a hidden field only bots fill in.
export const contactMessageSchema = z.object({
   type: z.enum(["contact", "consent"]),
   first_name: text(100).min(1),
   last_name: text(100).min(1),
   email: z.string().trim().max(254).refine(validateEmail),
   phone: z
      .string()
      .trim()
      .max(30)
      .refine((value) => value === "" || validatePhone(value))
      .optional(),
   message: text(2000).min(1),
   website: z.string().max(200).optional(),
});
