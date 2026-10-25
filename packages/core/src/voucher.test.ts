import { describe, expect, it } from "vitest";
import { evaluateVoucher, normalizeVoucherCode, Voucher, voucherError } from "./voucher";

const base: Voucher = { code: "SAVE10", type: "percent", value: 10, active: true };

describe("evaluateVoucher", () => {
   it("takes a share of the subtotal for percent vouchers, rounded to bani", () => {
      expect(evaluateVoucher(base, 199.99)).toEqual({ ok: true, discount: 20 });
      expect(evaluateVoucher({ ...base, value: 15 }, 333.33)).toEqual({ ok: true, discount: 50 });
   });

   it("never discounts more than the subtotal for fixed vouchers", () => {
      expect(evaluateVoucher({ ...base, type: "fixed", value: 50 }, 300)).toEqual({ ok: true, discount: 50 });
      expect(evaluateVoucher({ ...base, type: "fixed", value: 50 }, 30)).toEqual({ ok: true, discount: 30 });
   });

   it("caps percent values at 100", () => {
      expect(evaluateVoucher({ ...base, value: 150 }, 80)).toEqual({ ok: true, discount: 80 });
   });

   it("rejects inactive, expired and used-up vouchers", () => {
      const now = Date.parse("2026-10-16T12:00:00Z");
      expect(evaluateVoucher({ ...base, active: false }, 100, now)).toMatchObject({ ok: false, reason: "inactive" });
      expect(evaluateVoucher({ ...base, expires_at: Date.parse("2026-10-15T00:00:00Z") }, 100, now)).toMatchObject({ ok: false, reason: "expired" });
      expect(evaluateVoucher({ ...base, expires_at: { toMillis: () => now + 1000 } }, 100, now).ok).toBe(true);
      expect(evaluateVoucher({ ...base, max_uses: 5, uses: 5 }, 100, now)).toMatchObject({ ok: false, reason: "used_up" });
      expect(evaluateVoucher({ ...base, max_uses: 5, uses: 4 }, 100, now).ok).toBe(true);
   });

   it("applies the minimum order to the products subtotal", () => {
      expect(evaluateVoucher({ ...base, min_order: 200 }, 199.99)).toEqual({ ok: false, reason: "min_order", minOrder: 200 });
      expect(evaluateVoucher({ ...base, min_order: 200 }, 200).ok).toBe(true);
   });
});

describe("vouchers", () => {
   it("compares codes case-insensitively and without spaces", () => {
      expect(normalizeVoucherCode("  save10 ")).toBe("SAVE10");
   });

   it("has an error code for each failure, with the minimum order as a number", () => {
      expect(voucherError({ ok: false, reason: "min_order", minOrder: 200 })).toEqual({ error: "voucher_min_order", params: { minOrder: 200 } });
      expect(voucherError({ ok: false, reason: "expired" }).error).toBe("voucher_expired");
      expect(voucherError({ ok: false, reason: "used_up" }).error).toBe("voucher_used_up");
      // An inactive voucher looks like an unknown one
      expect(voucherError({ ok: false, reason: "inactive" }).error).toBe("voucher_not_found");
      expect(voucherError({ ok: false, reason: "not_found" }).error).toBe("voucher_not_found");
   });
});
