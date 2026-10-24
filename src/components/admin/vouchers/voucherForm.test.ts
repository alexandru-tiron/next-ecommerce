import { describe, expect, it } from "vitest";
import { endOfDay, validateVoucherForm, voucherStatus } from "./voucherForm";

const valid = { code: "summer25", type: "percent" as const, value: "25", minOrder: "", maxUses: "", expiresAt: "" };
const today = new Date(2026, 9, 16, 12);

describe("validateVoucherForm", () => {
   it("accepts a valid voucher", () => {
      expect(validateVoucherForm(valid, today)).toEqual({});
      expect(validateVoucherForm({ ...valid, type: "fixed", value: "50", minOrder: "200", maxUses: "100", expiresAt: "2026-10-16" }, today)).toEqual({});
   });

   it("checks the code format", () => {
      expect(validateVoucherForm({ ...valid, code: "ab" }, today).code).toBe("voucherCodeInvalid");
      expect(validateVoucherForm({ ...valid, code: "has space" }, today).code).toBe("voucherCodeInvalid");
   });

   it("checks the discount value", () => {
      expect(validateVoucherForm({ ...valid, value: "0" }, today).value).toBe("voucherValueInvalid");
      expect(validateVoucherForm({ ...valid, value: "120" }, today).value).toBe("voucherPercentTooHigh");
      expect(validateVoucherForm({ ...valid, type: "fixed", value: "120" }, today).value).toBeUndefined();
   });

   it("checks the optional limits", () => {
      expect(validateVoucherForm({ ...valid, minOrder: "-5" }, today).minOrder).toBe("voucherMinOrderInvalid");
      expect(validateVoucherForm({ ...valid, maxUses: "2.5" }, today).maxUses).toBe("voucherMaxUsesInvalid");
      expect(validateVoucherForm({ ...valid, expiresAt: "2026-10-15" }, today).expiresAt).toBe("voucherExpiryInvalid");
   });
});

describe("voucherStatus", () => {
   const now = Date.parse("2026-10-16T12:00:00Z");

   it("reports why a voucher can't be used", () => {
      expect(voucherStatus({ active: true }, now)).toBe("active");
      expect(voucherStatus({ active: false }, now)).toBe("inactive");
      expect(voucherStatus({ active: true, expiresAt: now - 1 }, now)).toBe("expired");
      expect(voucherStatus({ active: true, uses: 3, maxUses: 3 }, now)).toBe("usedUp");
   });
});

describe("endOfDay", () => {
   it("keeps a voucher valid until the end of its expiry date", () => {
      expect(endOfDay("2026-10-16")).toEqual(new Date(2026, 9, 16, 23, 59, 59, 999));
   });
});
