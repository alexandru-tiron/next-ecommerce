import { createHash } from "crypto";
import { z } from "zod";
import { StoreErrorCode } from "@core/errors";
import { LOCALES } from "@core/settings";
import { MAX_LINE_QUANTITY, MAX_ORDER_LINES } from "@core/orderLimits";
import { PAYMENT_METHODS } from "@core/payments";
import { validateEmail, validateName, validatePhone } from "@core/validators";
import { docId } from "./utils/validation";

// Input schemas for the callable functions. Lengths match the limits in firestore.rules.

const text = (max: number) => z.string().trim().max(max);
// The Firebase SDK sends undefined values as null, so optional fields also accept null (read as missing)
const optional = <T extends z.ZodType>(schema: T) => schema.nullish().transform((value) => value ?? undefined).optional();
// Address forms save these as text or as a number
const shortValue = z.union([text(20), z.number().finite()]);

// Checkouts before October 2026 built the key from the sign-in token (about 1,000 characters); long keys are hashed
const idempotencyKey = z
   .string()
   .max(4096)
   .transform((key) => (key.length > 200 ? createHash("sha256").update(key).digest("hex") : key));

const addressSchema = z.object({
   id: docId.optional(),
   city: text(100).min(1),
   county: text(100).min(1),
   street: text(200).min(1),
   street_no: shortValue,
   postal_code: shortValue,
   apartment: optional(shortValue),
   building: optional(shortValue),
   building_no: optional(shortValue),
   floor: optional(shortValue),
   intercom: optional(shortValue),
   details: optional(text(500)),
   business: optional(z.boolean()),
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
   discount: optional(z.boolean()),
   discount_price: optional(z.number().finite().nonnegative()),
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
   idempotency_key: optional(idempotencyKey),
   locale: z.enum(LOCALES).optional(),
});

export type OrderInput = z.infer<typeof orderInputSchema>;

// The error for the first invalid field of an order
export function orderInputError(field: PropertyKey | undefined): StoreErrorCode {
   switch (field) {
      case "first_name":
         return "invalid_first_name";
      case "last_name":
         return "invalid_last_name";
      case "email":
         return "invalid_email";
      case "phone_no":
         return "invalid_phone";
      case "shipping_address":
      case "shipping_address_id":
         return "shipping_address_invalid";
      case "billing_address":
      case "billing_address_id":
         return "billing_address_invalid";
      default:
         return "invalid_order";
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
