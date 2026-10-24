"use client";

import { db } from "@/lib/firebaseInit";
import { collection, doc, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Boxes, PackageX, AlertTriangle, Save, Search } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { LOW_STOCK_THRESHOLD, parseStockInput, stockStatus, StockStatus } from "@/components/admin/inventory/stockStatus";
import { refreshStore } from "@/lib/refreshStore";

type InventoryItem = { id: string; name: string; brand: string; product_code: string; image?: string; stoc?: number; sold: number };
type View = "all" | "low" | "out";

const badgeClasses: Record<StockStatus, string> = {
   out: "bg-red-100 text-red-800",
   low: "bg-yellow-100 text-yellow-800",
   ok: "bg-green-100 text-green-800",
   untracked: "bg-gray-100 text-gray-600",
};

export default function InventoryPage() {
   const t = useTranslations("Admin");
   const [items, setItems] = useState<InventoryItem[]>([]);
   const [loading, setLoading] = useState(true);
   const [view, setView] = useState<View>("all");
   const [search, setSearch] = useState("");
   const [drafts, setDrafts] = useState<Record<string, string>>({});
   const [saving, setSaving] = useState<string | null>(null);
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
      getDocs(collection(db, "Products"))
         .then((snap) =>
            setItems(
               snap.docs.map((product) => ({
                  id: product.id,
                  name: product.data().name,
                  brand: product.data().brand,
                  product_code: product.data().product_code,
                  image: product.data().product_images?.[0],
                  stoc: product.data().stoc,
                  sold: product.data().sold ?? 0,
               }))
            )
         )
         .catch((err) => {
            console.error("Error loading inventory:", err);
            setError(t("inventoryLoadError"));
         })
         .finally(() => setLoading(false));
   }, [t]);

   const counts = useMemo(
      () => ({
         low: items.filter((item) => stockStatus(item.stoc) === "low").length,
         out: items.filter((item) => stockStatus(item.stoc) === "out").length,
         units: items.reduce((acc, item) => acc + (item.stoc ?? 0), 0),
      }),
      [items]
   );

   const visible = useMemo(() => {
      const term = search.trim().toLowerCase();
      return items
         .filter((item) => view === "all" || stockStatus(item.stoc) === view)
         .filter((item) => !term || item.name.toLowerCase().includes(term) || item.product_code?.toLowerCase().includes(term) || item.brand?.toLowerCase().includes(term))
         .sort((a, b) => (a.stoc ?? Number.MAX_SAFE_INTEGER) - (b.stoc ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name));
   }, [items, view, search]);

   const saveStock = async (item: InventoryItem) => {
      const value = parseStockInput(drafts[item.id] ?? "");
      if (value === null) return;
      setSaving(item.id);
      setError(null);
      try {
         // Saving the product also updates the Algolia record through the sync function
         await updateDoc(doc(db, "Products", item.id), { stoc: value, updated_at: serverTimestamp() });
         await refreshStore("catalog");
         setItems((current) => current.map((product) => (product.id === item.id ? { ...product, stoc: value } : product)));
         setDrafts((current) => {
            const rest = { ...current };
            delete rest[item.id];
            return rest;
         });
      } catch (err) {
         console.error("Error saving stock:", err);
         setError(t("inventorySaveError"));
      } finally {
         setSaving(null);
      }
   };

   const statusLabel = (status: StockStatus) => ({ out: t("outOfStock"), low: t("lowStock"), ok: t("inStock"), untracked: t("stockUntracked") })[status];

   if (loading) {
      return (
         <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
         </div>
      );
   }

   return (
      <div className="space-y-6">
         <div>
            <h1 className="text-2xl font-semibold text-gray-900">{t("inventory")}</h1>
            <p className="mt-1 text-sm text-gray-500">{t("inventoryDescription", { threshold: LOW_STOCK_THRESHOLD })}</p>
         </div>

         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
               { label: t("unitsInStock"), value: counts.units, icon: <Boxes className="w-6 h-6 text-gray-500" />, view: "all" as View },
               { label: t("lowStock"), value: counts.low, icon: <AlertTriangle className="w-6 h-6 text-yellow-600" />, view: "low" as View },
               { label: t("outOfStock"), value: counts.out, icon: <PackageX className="w-6 h-6 text-red-600" />, view: "out" as View },
            ].map((card) => (
               <button key={card.label} onClick={() => setView(card.view)} className={twMerge("bg-white rounded-lg border p-4 flex items-center gap-4 text-left", view === card.view ? "border-black" : "border-gray-100")}>
                  {card.icon}
                  <div>
                     <p className="text-sm text-gray-500">{card.label}</p>
                     <p className="text-2xl font-semibold">{card.value}</p>
                  </div>
               </button>
            ))}
         </div>

         <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("searchInventory")} className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-sm" />
         </div>

         {error && <div className="p-3 rounded-md bg-red-50 text-red-800 text-sm">{error}</div>}

         <div className="bg-white rounded-lg border border-gray-100 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
               <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                  <tr>
                     <th className="px-4 py-3">{t("product")}</th>
                     <th className="px-4 py-3">{t("status")}</th>
                     <th className="px-4 py-3 text-right">{t("sold")}</th>
                     <th className="px-4 py-3">{t("stock")}</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                  {visible.map((item) => {
                     const status = stockStatus(item.stoc);
                     const draft = drafts[item.id];
                     const changed = draft !== undefined && draft !== String(item.stoc ?? "");
                     const valid = draft === undefined || parseStockInput(draft) !== null;
                     return (
                        <tr key={item.id}>
                           <td className="px-4 py-3">
                              <Link href={`/admin/products/${item.id}`} className="flex items-center gap-3 hover:underline">
                                 <div className="relative w-10 h-10 shrink-0 bg-gray-50 rounded">{item.image && <Image src={item.image} alt="" fill sizes="40px" className="object-contain" />}</div>
                                 <div className="min-w-0">
                                    <p className="font-medium truncate max-w-[280px]">{item.name}</p>
                                    <p className="text-xs text-gray-500">
                                       {item.brand} · {item.product_code}
                                    </p>
                                 </div>
                              </Link>
                           </td>
                           <td className="px-4 py-3">
                              <span className={twMerge("px-2 py-1 rounded-full text-xs font-medium", badgeClasses[status])}>{statusLabel(status)}</span>
                           </td>
                           <td className="px-4 py-3 text-right">{item.sold}</td>
                           <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                 <input
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={draft ?? item.stoc ?? ""}
                                    onChange={(e) => setDrafts((current) => ({ ...current, [item.id]: e.target.value }))}
                                    onKeyDown={(e) => e.key === "Enter" && changed && valid && saveStock(item)}
                                    aria-label={`${t("stock")} ${item.name}`}
                                    className={twMerge("w-24 px-2 py-1 border rounded", valid ? "border-gray-200" : "border-red-400")}
                                 />
                                 {changed && (
                                    <button onClick={() => saveStock(item)} disabled={!valid || saving === item.id} className="p-1.5 rounded bg-black text-white disabled:opacity-40" aria-label={t("saveStock")} title={t("saveStock")}>
                                       <Save className="w-4 h-4" />
                                    </button>
                                 )}
                              </div>
                           </td>
                        </tr>
                     );
                  })}
                  {visible.length === 0 && (
                     <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                           {t("noProducts")}
                        </td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
   );
}
