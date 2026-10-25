import { StoreErrorCode, StoreErrorParams } from "./errors";

// Voucher rules shared by checkVoucher (preview at checkout) and validateAndCreateOrder (applied for real)
export type Voucher = {
   code: string;
   type: "percent" | "fixed";
   value: number;
   active: boolean;
   min_order?: number | null;
   max_uses?: number | null;
   uses?: number;
   expires_at?: { toMillis(): number } | Date | number | null;
};

export type VoucherCheck = { ok: true; discount: number } | { ok: false; reason: "inactive" | "expired" | "used_up" | "min_order"; minOrder?: number };

export const normalizeVoucherCode = (code: string) => code.trim().toUpperCase();

const toMillis = (value: Voucher["expires_at"]) => {
   if (value === null || value === undefined) return null;
   if (typeof value === "number") return value;
   if (value instanceof Date) return value.getTime();
   return typeof value.toMillis === "function" ? value.toMillis() : null;
};

// Discount for a subtotal (products only, before shipping), rounded to bani and never more than the subtotal
export function evaluateVoucher(voucher: Voucher, subtotal: number, now = Date.now()): VoucherCheck {
   if (!voucher.active) return { ok: false, reason: "inactive" };
   const expiresAt = toMillis(voucher.expires_at);
   if (expiresAt !== null && expiresAt < now) return { ok: false, reason: "expired" };
   if (typeof voucher.max_uses === "number" && (voucher.uses ?? 0) >= voucher.max_uses) return { ok: false, reason: "used_up" };
   if (typeof voucher.min_order === "number" && subtotal < voucher.min_order) return { ok: false, reason: "min_order", minOrder: voucher.min_order };

   const raw = voucher.type === "percent" ? (subtotal * Math.min(Math.max(voucher.value, 0), 100)) / 100 : Math.max(voucher.value, 0);
   return { ok: true, discount: Math.round(Math.min(raw, subtotal) * 100) / 100 };
}

// The error the store shows for a voucher that can't be used. An inactive voucher looks like an unknown one.
// The minimum order is a plain number; the store formats it in its currency.
export function voucherError(check: Exclude<VoucherCheck, { ok: true }> | { ok: false; reason: "not_found" }): { error: StoreErrorCode; params: StoreErrorParams } {
   switch (check.reason) {
      case "expired":
         return { error: "voucher_expired", params: {} };
      case "used_up":
         return { error: "voucher_used_up", params: {} };
      case "min_order":
         return { error: "voucher_min_order", params: { minOrder: "minOrder" in check ? (check.minOrder ?? 0) : 0 } };
      default:
         return { error: "voucher_not_found", params: {} };
   }
}
