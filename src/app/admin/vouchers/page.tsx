"use client";

import { db } from "@/lib/firebaseInit";
import { collection, deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import { FormEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { endOfDay, normalizeCode, validateVoucherForm, VoucherFormErrors, VoucherFormInput, voucherStatus, VoucherStatus, VoucherType } from "@/components/admin/vouchers/voucherForm";
import { Money } from "@/components/common/Price";
import { useFormatDate } from "@/components/common/useFormatDate";
import { useStoreFormat } from "@/components/StoreSettingsProvider";

type VoucherRow = { code: string; type: VoucherType; value: number; minOrder?: number | null; maxUses?: number | null; uses: number; expiresAt?: number | null; active: boolean };

const emptyForm: VoucherFormInput = { code: "", type: "percent", value: "", minOrder: "", maxUses: "", expiresAt: "" };
const statusClasses: Record<VoucherStatus, string> = {
   active: "bg-green-100 text-green-800",
   inactive: "bg-gray-100 text-gray-600",
   expired: "bg-red-100 text-red-800",
   usedUp: "bg-yellow-100 text-yellow-800",
};

export default function VouchersPage() {
   const t = useTranslations("Admin");
   const formatStoreDate = useFormatDate();
   const { currency } = useStoreFormat();
   const [vouchers, setVouchers] = useState<VoucherRow[]>([]);
   const [form, setForm] = useState<VoucherFormInput>(emptyForm);
   const [errors, setErrors] = useState<VoucherFormErrors>({});
   const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
   const [saving, setSaving] = useState(false);

   useEffect(
      () =>
         onSnapshot(
            collection(db, "Vouchers"),
            (snap) =>
               setVouchers(
                  snap.docs
                     .map((voucher) => {
                        const data = voucher.data();
                        return {
                           code: voucher.id,
                           type: data.type,
                           value: data.value,
                           minOrder: data.min_order,
                           maxUses: data.max_uses,
                           uses: data.uses ?? 0,
                           expiresAt: data.expires_at instanceof Timestamp ? data.expires_at.toMillis() : null,
                           active: data.active,
                        };
                     })
                     .sort((a, b) => a.code.localeCompare(b.code))
               ),
            (error) => {
               console.error("Error loading vouchers:", error);
               setMessage({ type: "error", text: t("vouchersLoadError") });
            }
         ),
      [t]
   );

   const createVoucher = async (event: FormEvent) => {
      event.preventDefault();
      const formErrors = validateVoucherForm(form);
      setErrors(formErrors);
      if (Object.keys(formErrors).length > 0) return;

      const code = normalizeCode(form.code);
      setSaving(true);
      setMessage(null);
      try {
         const ref = doc(db, "Vouchers", code);
         if ((await getDoc(ref)).exists()) {
            setErrors({ code: "voucherCodeExists" });
            return;
         }
         await setDoc(ref, {
            code,
            type: form.type,
            value: Number(form.value),
            min_order: form.minOrder.trim() ? Number(form.minOrder) : null,
            max_uses: form.maxUses.trim() ? Number(form.maxUses) : null,
            uses: 0,
            expires_at: form.expiresAt ? Timestamp.fromDate(endOfDay(form.expiresAt)) : null,
            active: true,
            created_at: serverTimestamp(),
         });
         setForm(emptyForm);
         setMessage({ type: "success", text: t("voucherCreated", { code }) });
      } catch (error) {
         console.error("Error creating voucher:", error);
         setMessage({ type: "error", text: t("voucherSaveError") });
      } finally {
         setSaving(false);
      }
   };

   const toggleActive = (voucher: VoucherRow) =>
      updateDoc(doc(db, "Vouchers", voucher.code), { active: !voucher.active }).catch((error) => {
         console.error("Error updating voucher:", error);
         setMessage({ type: "error", text: t("voucherSaveError") });
      });

   const removeVoucher = (voucher: VoucherRow) => {
      if (!window.confirm(t("voucherDeleteConfirm", { code: voucher.code }))) return;
      deleteDoc(doc(db, "Vouchers", voucher.code)).catch((error) => {
         console.error("Error deleting voucher:", error);
         setMessage({ type: "error", text: t("voucherSaveError") });
      });
   };

   const field = (name: keyof VoucherFormInput, label: string, input: React.ReactNode) => (
      <label className="flex flex-col gap-1 text-sm">
         <span className="text-gray-600">{label}</span>
         {input}
         {errors[name as keyof VoucherFormErrors] && <span className="text-xs text-red-600">{t(errors[name as keyof VoucherFormErrors]!)}</span>}
      </label>
   );
   const inputClass = "px-3 py-2 border border-gray-200 rounded-md";
   const statusLabel = (status: VoucherStatus) => ({ active: t("voucherActive"), inactive: t("voucherInactive"), expired: t("voucherExpired"), usedUp: t("voucherUsedUp") })[status];

   return (
      <div className="space-y-6">
         <div>
            <h1 className="text-2xl font-semibold text-gray-900">{t("vouchers")}</h1>
            <p className="mt-1 text-sm text-gray-500">{t("vouchersDescription")}</p>
         </div>

         {message && <div className={twMerge("p-3 rounded-md text-sm", message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800")}>{message.text}</div>}

         <form onSubmit={createVoucher} className="bg-white rounded-lg border border-gray-100 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {field("code", t("voucherCode"), <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="SUMMER25" className={twMerge(inputClass, "uppercase")} />)}
            {field(
               "type",
               t("voucherType"),
               <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as VoucherType })} className={inputClass}>
                  <option value="percent">{t("voucherPercent")}</option>
                  <option value="fixed">{t("voucherFixed")}</option>
               </select>
            )}
            {field("value", form.type === "percent" ? t("voucherValuePercent") : t("voucherValueAmount", { currency }), <input type="number" min={0} step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className={inputClass} />)}
            {field("minOrder", t("voucherMinOrder", { currency }), <input type="number" min={0} step="0.01" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} placeholder={t("optional")} className={inputClass} />)}
            {field("maxUses", t("voucherMaxUses"), <input type="number" min={1} step={1} value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} placeholder={t("optional")} className={inputClass} />)}
            {field("expiresAt", t("voucherExpires"), <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className={inputClass} />)}
            <div className="sm:col-span-2 lg:col-span-3">
               <button type="submit" disabled={saving} className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-black hover:bg-gray-800 disabled:opacity-50">
                  <Plus className="w-4 h-4 mr-2" />
                  {t("createVoucher")}
               </button>
            </div>
         </form>

         <div className="bg-white rounded-lg border border-gray-100 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
               <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                  <tr>
                     <th className="px-4 py-3">{t("voucherCode")}</th>
                     <th className="px-4 py-3">{t("voucherDiscount")}</th>
                     <th className="px-4 py-3">{t("voucherMinOrder", { currency })}</th>
                     <th className="px-4 py-3">{t("voucherUses")}</th>
                     <th className="px-4 py-3">{t("voucherExpires")}</th>
                     <th className="px-4 py-3">{t("status")}</th>
                     <th className="px-4 py-3" />
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                  {vouchers.map((voucher) => {
                     const status = voucherStatus(voucher);
                     return (
                        <tr key={voucher.code}>
                           <td className="px-4 py-3 font-mono font-medium">{voucher.code}</td>
                           <td className="px-4 py-3">{voucher.type === "percent" ? `${voucher.value}%` : <Money amount={voucher.value} />}</td>
                           <td className="px-4 py-3">{voucher.minOrder ? <Money amount={voucher.minOrder} /> : "—"}</td>
                           <td className="px-4 py-3">
                              {voucher.uses}
                              {voucher.maxUses ? ` / ${voucher.maxUses}` : ""}
                           </td>
                           <td className="px-4 py-3">{voucher.expiresAt ? formatStoreDate(voucher.expiresAt) : "—"}</td>
                           <td className="px-4 py-3">
                              <span className={twMerge("px-2 py-1 rounded-full text-xs font-medium", statusClasses[status])}>{statusLabel(status)}</span>
                           </td>
                           <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-3">
                                 <button onClick={() => toggleActive(voucher)} className="text-sm text-gray-700 hover:underline">
                                    {voucher.active ? t("deactivate") : t("activate")}
                                 </button>
                                 <button onClick={() => removeVoucher(voucher)} className="p-1 rounded-md hover:bg-red-50 text-red-600" aria-label={t("deleteVoucher")} title={t("deleteVoucher")}>
                                    <Trash2 className="w-4 h-4" />
                                 </button>
                              </div>
                           </td>
                        </tr>
                     );
                  })}
                  {vouchers.length === 0 && (
                     <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                           {t("noVouchers")}
                        </td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
   );
}
