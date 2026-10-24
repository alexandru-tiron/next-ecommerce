import { HttpsError, onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { evaluateVoucher, normalizeVoucherCode, Voucher, voucherMessage } from "../utils/voucher";
import { enforceAppCheck } from "../utils/params";
const db = getFirestore();

// Previews a voucher at checkout. Vouchers aren't readable by customers, so the check runs here.
// The order function validates and applies the voucher again, so this result is only informative.
export const checkVoucher = onCall({ enforceAppCheck }, async (request) => {
   if (!request.auth) {
      throw new HttpsError("unauthenticated", "Utilizatorul nu este autentificat.");
   }
   const code = typeof request.data?.code === "string" ? normalizeVoucherCode(request.data.code) : "";
   const subtotal = Number(request.data?.subtotal);
   if (!/^[A-Z0-9_-]{3,30}$/.test(code) || !Number.isFinite(subtotal) || subtotal < 0) {
      return { valid: false, message: voucherMessage({ ok: false, reason: "not_found" }) };
   }

   const snap = await db.collection("Vouchers").doc(code).get();
   if (!snap.exists) return { valid: false, message: voucherMessage({ ok: false, reason: "not_found" }) };

   const voucher = snap.data() as Voucher;
   const check = evaluateVoucher(voucher, subtotal);
   if (!check.ok) return { valid: false, message: voucherMessage(check) };
   return { valid: true, code, discount: check.discount, type: voucher.type, value: voucher.value };
});
