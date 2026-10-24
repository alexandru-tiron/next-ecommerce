// Validation and status rules for the admin voucher page. They mirror functions/src/utils/voucher.ts,
// which is what actually decides whether a voucher can be used.
export type VoucherType = "percent" | "fixed";

export type VoucherFormInput = { code: string; type: VoucherType; value: string; minOrder: string; maxUses: string; expiresAt: string };
export type VoucherFormErrors = Partial<Record<"code" | "value" | "minOrder" | "maxUses" | "expiresAt", string>>;

export const normalizeCode = (code: string) => code.trim().toUpperCase();
const positive = (value: string) => value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) > 0;

// Returns error message keys (Admin.*) per field; an empty object means the form is valid
export function validateVoucherForm(input: VoucherFormInput, today = new Date()): VoucherFormErrors {
   const errors: VoucherFormErrors = {};
   if (!/^[A-Z0-9_-]{3,30}$/.test(normalizeCode(input.code))) errors.code = "voucherCodeInvalid";
   if (!positive(input.value)) errors.value = "voucherValueInvalid";
   else if (input.type === "percent" && Number(input.value) > 100) errors.value = "voucherPercentTooHigh";
   if (input.minOrder.trim() !== "" && !positive(input.minOrder)) errors.minOrder = "voucherMinOrderInvalid";
   if (input.maxUses.trim() !== "" && !(positive(input.maxUses) && Number.isInteger(Number(input.maxUses)))) errors.maxUses = "voucherMaxUsesInvalid";
   if (input.expiresAt) {
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      if (Number.isNaN(Date.parse(input.expiresAt)) || endOfDay(input.expiresAt).getTime() < startOfToday) errors.expiresAt = "voucherExpiryInvalid";
   }
   return errors;
}

// A voucher picked to expire on a date stays valid until the end of that day (local time)
export function endOfDay(date: string) {
   const [year, month, day] = date.split("-").map(Number);
   return new Date(year, month - 1, day, 23, 59, 59, 999);
}

export type VoucherStatus = "active" | "inactive" | "expired" | "usedUp";

export function voucherStatus(voucher: { active: boolean; expiresAt?: number | null; uses?: number; maxUses?: number | null }, now = Date.now()): VoucherStatus {
   if (!voucher.active) return "inactive";
   if (voucher.expiresAt && voucher.expiresAt < now) return "expired";
   if (typeof voucher.maxUses === "number" && (voucher.uses ?? 0) >= voucher.maxUses) return "usedUp";
   return "active";
}
