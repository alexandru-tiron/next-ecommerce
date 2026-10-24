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

// Customer-facing messages (Romanian, like the other order errors)
export function voucherMessage(check: Exclude<VoucherCheck, { ok: true }> | { ok: false; reason: "not_found" }) {
   switch (check.reason) {
      case "expired":
         return "Voucherul a expirat.";
      case "used_up":
         return "Voucherul a fost folosit de numărul maxim de ori.";
      case "min_order":
         return `Voucherul se aplică doar comenzilor de minimum ${"minOrder" in check ? check.minOrder : ""} Lei.`;
      default:
         return "Codul de voucher nu este valid.";
   }
}
