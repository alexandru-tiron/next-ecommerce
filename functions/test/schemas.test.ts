import { describe, expect, it } from "vitest";
import { contactMessageSchema, orderInputError, orderInputSchema, paymentInputSchema, voucherInputSchema } from "../src/schemas";

const address = { city: "Cluj-Napoca", county: "Cluj", street: "Strada Exemplu", street_no: 12, postal_code: "400001", business: false };
const line = { id: "line-1", product_id: "demo-aurion-pods-anc", product_name: "Aurion Pods ANC", product_code: "AUR-3139", product_image: "x", product_price: 799, quantity: 2 };
const order = {
   first_name: "Ana",
   last_name: "Pop",
   email: "ana@example.com",
   phone_no: "0712345678",
   shipping_address: address,
   billing_address: address,
   payment_method: "cod",
   products: [line],
};

describe("orderInputSchema", () => {
   it("accepts the order the checkout sends", () => {
      expect(orderInputSchema.safeParse(order).success).toBe(true);
   });

   it("drops fields it doesn't know, including inside addresses and lines", () => {
      const parsed = orderInputSchema.parse({ ...order, status: "delivered", shipping_address: { ...address, admin_note: "x" }, products: [{ ...line, verified: true }] });
      expect(parsed).not.toHaveProperty("status");
      expect(parsed.shipping_address).not.toHaveProperty("admin_note");
      expect(parsed.products[0]).not.toHaveProperty("verified");
   });

   // The Firebase SDK sends undefined values as null, e.g. the discount of a cart line that has none
   it("treats null optional fields as missing", () => {
      const parsed = orderInputSchema.parse({ ...order, shipping_address: { ...address, floor: null }, products: [{ ...line, discount: null, discount_price: null }] });
      expect(parsed.products[0].discount).toBeUndefined();
      expect(parsed.shipping_address?.floor).toBeUndefined();
   });

   // Older checkouts sent keys built from the sign-in token, about 1,000 characters long
   it("keeps short idempotency keys and hashes long ones", () => {
      expect(orderInputSchema.parse({ ...order, idempotency_key: "a1b2-c3" }).idempotency_key).toBe("a1b2-c3");
      const hashed = orderInputSchema.parse({ ...order, idempotency_key: "x".repeat(1200) }).idempotency_key;
      expect(hashed).toMatch(/^[0-9a-f]{64}$/);
      expect(orderInputSchema.parse({ ...order, idempotency_key: "x".repeat(1200) }).idempotency_key).toBe(hashed);
   });

   it.each([0, -3, 1.5, 1000])("rejects quantity %s", (quantity) => {
      expect(orderInputSchema.safeParse({ ...order, products: [{ ...line, quantity }] }).success).toBe(false);
   });

   it("rejects empty or oversized orders, ids with slashes and oversized text", () => {
      expect(orderInputSchema.safeParse({ ...order, products: [] }).success).toBe(false);
      expect(orderInputSchema.safeParse({ ...order, products: Array(101).fill(line) }).success).toBe(false);
      expect(orderInputSchema.safeParse({ ...order, products: [{ ...line, product_id: "a/b" }] }).success).toBe(false);
      expect(orderInputSchema.safeParse({ ...order, shipping_address: { ...address, details: "x".repeat(501) } }).success).toBe(false);
      expect(orderInputSchema.safeParse({ ...order, payment_method: "bitcoin" }).success).toBe(false);
   });

   it("explains which field is wrong", () => {
      const field = orderInputSchema.safeParse({ ...order, phone_no: "123" }).error?.issues[0]?.path[0];
      expect(orderInputError(field)).toBe("invalid_phone");
      expect(orderInputError("products")).toBe("invalid_order");
   });
});

describe("other inputs", () => {
   it("check voucher previews", () => {
      expect(voucherInputSchema.safeParse({ code: "SAVE10", subtotal: 120 }).success).toBe(true);
      expect(voucherInputSchema.safeParse({ code: "SAVE10", subtotal: -1 }).success).toBe(false);
      expect(voucherInputSchema.safeParse({ code: "SAVE10", subtotal: "120" }).success).toBe(false);
   });

   it("check contact messages", () => {
      const message = { type: "contact", first_name: "Ana", last_name: "Pop", email: "ana@example.com", phone: "0712 345 678", message: "Hello" };
      expect(contactMessageSchema.safeParse(message).success).toBe(true);
      expect(contactMessageSchema.safeParse({ ...message, phone: "" }).success).toBe(true);
      expect(contactMessageSchema.safeParse({ ...message, phone: "12" }).success).toBe(false);
      expect(contactMessageSchema.safeParse({ ...message, email: "ana@" }).success).toBe(false);
      expect(contactMessageSchema.safeParse({ ...message, message: "x".repeat(2001) }).success).toBe(false);
      expect(contactMessageSchema.safeParse({ ...message, type: "newsletter" }).success).toBe(false);
   });

   it("check payment requests", () => {
      expect(paymentInputSchema.safeParse({ orderId: "abc123", origin: "https://shop.example.com" }).success).toBe(true);
      expect(paymentInputSchema.safeParse({ orderId: "Orders/other" }).success).toBe(false);
   });
});
