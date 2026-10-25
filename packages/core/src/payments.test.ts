import { describe, expect, it } from "vitest";
import {
   availablePaymentMethods,
   canPayOrder,
   isMethodEnabled,
   orderCurrency,
   netopiaPaymentStatus,
   orderPaymentMethod,
   paymentSettingsFrom,
   safeReturnOrigin,
   shouldApplyPaymentStatus,
   stripeEventPaymentStatus,
   toMinorUnits,
} from "./payments";

describe("payment settings", () => {
   it("default to cash on delivery only", () => {
      const settings = paymentSettingsFrom(undefined);
      expect(isMethodEnabled("cod", settings, "RON")).toBe(true);
      expect(isMethodEnabled("stripe", settings, "RON")).toBe(false);
      expect(availablePaymentMethods(settings, "RON")).toEqual(["cod"]);
   });

   it("need a POS signature before NETOPIA is offered", () => {
      expect(isMethodEnabled("netopia", paymentSettingsFrom({ netopia_enabled: true }), "RON")).toBe(false);
      expect(isMethodEnabled("netopia", paymentSettingsFrom({ netopia_enabled: true, netopia_pos_signature: "POS-1" }), "RON")).toBe(true);
      expect(availablePaymentMethods(paymentSettingsFrom({ stripe_enabled: true, netopia_enabled: true }), "RON")).toEqual(["cod", "stripe"]);
      expect(availablePaymentMethods(paymentSettingsFrom({ stripe_enabled: true, netopia_enabled: true, netopia_pos_signature: "POS" }), "RON")).toEqual(["cod", "stripe", "netopia"]);
   });

   it("offer NETOPIA only for prices in RON", () => {
      const settings = paymentSettingsFrom({ stripe_enabled: true, netopia_enabled: true, netopia_pos_signature: "POS" });
      expect(isMethodEnabled("netopia", settings, "EUR")).toBe(false);
      expect(availablePaymentMethods(settings, "EUR")).toEqual(["cod", "stripe"]);
   });

   it("treat orders without a currency as RON", () => {
      expect(orderCurrency({})).toBe("RON");
      expect(orderCurrency({ currency: "EUR" })).toBe("EUR");
   });

   it("fall back to cash on delivery when everything is switched off", () => {
      expect(availablePaymentMethods(paymentSettingsFrom({ cod_enabled: false }), "EUR")).toEqual(["cod"]);
      expect(availablePaymentMethods(paymentSettingsFrom({ cod_enabled: false, stripe_enabled: true }), "EUR")).toEqual(["stripe"]);
   });
});

describe("orders", () => {
   it("treat orders without a payment method as cash on delivery", () => {
      expect(orderPaymentMethod({})).toBe("cod");
      expect(orderPaymentMethod({ payment_method: "netopia" })).toBe("netopia");
   });

   it("can be paid while a card payment is pending or failed", () => {
      expect(canPayOrder({ payment_method: "stripe", payment_status: "pending", status: "pending" })).toBe(true);
      expect(canPayOrder({ payment_method: "netopia", payment_status: "failed", status: "pending" })).toBe(true);
   });

   it("can't be paid when paid, cancelled or cash on delivery", () => {
      expect(canPayOrder({ payment_method: "stripe", payment_status: "paid" })).toBe(false);
      expect(canPayOrder({ payment_method: "stripe", payment_status: "pending", status: "rejected" })).toBe(false);
      expect(canPayOrder({ payment_status: "pending" })).toBe(false);
   });
});

describe("payment statuses", () => {
   it("map NETOPIA status codes", () => {
      expect(netopiaPaymentStatus(3)).toBe("paid");
      expect(netopiaPaymentStatus(5)).toBe("paid");
      expect(netopiaPaymentStatus(8)).toBe("refunded");
      expect(netopiaPaymentStatus(12)).toBe("failed");
      expect(netopiaPaymentStatus(23)).toBe("expired");
      expect(netopiaPaymentStatus(15)).toBe("pending");
      expect(netopiaPaymentStatus(13)).toBe("pending");
   });

   it("map Stripe checkout events", () => {
      expect(stripeEventPaymentStatus("checkout.session.completed", "paid")).toBe("paid");
      expect(stripeEventPaymentStatus("checkout.session.completed", "unpaid")).toBe("pending");
      expect(stripeEventPaymentStatus("checkout.session.async_payment_failed")).toBe("failed");
      expect(stripeEventPaymentStatus("checkout.session.expired")).toBe("expired");
      expect(stripeEventPaymentStatus("customer.created")).toBeNull();
   });

   it("never move back from paid or refunded", () => {
      expect(shouldApplyPaymentStatus("pending", "paid")).toBe(true);
      expect(shouldApplyPaymentStatus("paid", "expired")).toBe(false);
      expect(shouldApplyPaymentStatus("paid", "refunded")).toBe(true);
      expect(shouldApplyPaymentStatus("refunded", "paid")).toBe(false);
      expect(shouldApplyPaymentStatus("paid", "paid")).toBe(false);
      expect(shouldApplyPaymentStatus("failed", "paid")).toBe(true);
   });
});

describe("payment helpers", () => {
   it("convert lei to bani without floating point drift", () => {
      expect(toMinorUnits(1699.99)).toBe(169999);
      expect(toMinorUnits(0.1 + 0.2)).toBe(30);
   });

   it("only redirect back to our own site or localhost", () => {
      const site = "https://shop.example.com";
      expect(safeReturnOrigin("https://shop.example.com", site)).toBe(site);
      expect(safeReturnOrigin("http://localhost:3001", site)).toBe("http://localhost:3001");
      expect(safeReturnOrigin("https://evil.example.com", site)).toBe(site);
      expect(safeReturnOrigin(undefined, site + "/")).toBe(site);
   });
});
