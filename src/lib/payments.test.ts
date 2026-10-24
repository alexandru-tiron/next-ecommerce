import { describe, expect, it, vi } from "vitest";

// payments.ts imports the Firebase app for startCardPayment; the pure helpers tested here don't need it
vi.mock("@/lib/firebaseInit", () => ({ default: {} }));
vi.mock("firebase/functions", () => ({ getFunctions: vi.fn(), httpsCallable: vi.fn() }));

const { availablePaymentMethods, canPayOrder, orderPaymentMethod, paymentSettingsFrom } = await import("./payments");

describe("availablePaymentMethods", () => {
   it("offers only cash on delivery by default", () => {
      expect(availablePaymentMethods(paymentSettingsFrom(undefined))).toEqual(["cod"]);
   });

   it("adds the enabled card providers; NETOPIA also needs a POS signature", () => {
      expect(availablePaymentMethods(paymentSettingsFrom({ stripe_enabled: true, netopia_enabled: true }))).toEqual(["cod", "stripe"]);
      expect(availablePaymentMethods(paymentSettingsFrom({ stripe_enabled: true, netopia_enabled: true, netopia_pos_signature: "POS" }))).toEqual(["cod", "stripe", "netopia"]);
   });

   it("falls back to cash on delivery when everything is switched off", () => {
      expect(availablePaymentMethods(paymentSettingsFrom({ cod_enabled: false }))).toEqual(["cod"]);
      expect(availablePaymentMethods(paymentSettingsFrom({ cod_enabled: false, stripe_enabled: true }))).toEqual(["stripe"]);
   });
});

describe("canPayOrder", () => {
   it("allows paying card orders that are pending or failed", () => {
      expect(canPayOrder({ payment_method: "stripe", payment_status: "pending", status: "pending" })).toBe(true);
      expect(canPayOrder({ payment_method: "netopia", payment_status: "failed", status: "pending" })).toBe(true);
   });

   it("doesn't for paid, cancelled or cash-on-delivery orders", () => {
      expect(canPayOrder({ payment_method: "stripe", payment_status: "paid" })).toBe(false);
      expect(canPayOrder({ payment_method: "stripe", payment_status: "pending", status: "rejected" })).toBe(false);
      expect(canPayOrder({ payment_status: "pending" })).toBe(false);
   });
});

describe("orderPaymentMethod", () => {
   it("treats orders without a payment method as cash on delivery", () => {
      expect(orderPaymentMethod({})).toBe("cod");
      expect(orderPaymentMethod({ payment_method: "netopia" })).toBe("netopia");
   });
});
