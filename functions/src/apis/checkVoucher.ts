import { onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { evaluateVoucher, normalizeVoucherCode, Voucher, voucherError } from "@core/voucher";
import { storeError } from "../utils/errors";
import { enforceAppCheck } from "../utils/params";
import { voucherInputSchema } from "../schemas";
const db = getFirestore();

// Previews a voucher at checkout. Vouchers aren't readable by customers, so the check runs here.
// The order function validates and applies the voucher again, so this result is only informative.
export const checkVoucher = onCall({ enforceAppCheck }, async (request) => {
   if (!request.auth) {
      throw storeError("unauthenticated", "not_signed_in");
   }
   // A malformed code gets the same answer as an unknown one
   const input = voucherInputSchema.safeParse(request.data);
   const code = input.success ? normalizeVoucherCode(input.data.code) : "";
   if (!input.success || !/^[A-Z0-9_-]{3,30}$/.test(code)) {
      return { valid: false, ...voucherError({ ok: false, reason: "not_found" }) };
   }
   const { subtotal } = input.data;

   const snap = await db.collection("Vouchers").doc(code).get();
   if (!snap.exists) return { valid: false, ...voucherError({ ok: false, reason: "not_found" }) };

   const voucher = snap.data() as Voucher;
   const check = evaluateVoucher(voucher, subtotal);
   if (!check.ok) return { valid: false, ...voucherError(check) };
   return { valid: true, code, discount: check.discount, type: voucher.type, value: voucher.value };
});
