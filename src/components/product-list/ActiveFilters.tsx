"use client";

import { SearchParams } from "@/types/product";
import { listParam, MultiValueFilter, toggleListValue } from "@/lib/algoliaFilters";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { hasActiveFilters, useFilterNavigation } from "./Filter";

// Removable chips for every filter currently applied to the product list
const ActiveFilters = ({ params }: { params: SearchParams }) => {
   const t = useTranslations("ProductList");
   const navigate = useFilterNavigation();
   if (!hasActiveFilters(params)) return null;

   const chips: { label: string; remove: Record<string, string | undefined> }[] = [];
   if (params.cat) chips.push({ label: params.cat, remove: { cat: undefined, subcat: undefined } });
   if (params.subcat) chips.push({ label: params.subcat, remove: { subcat: undefined } });
   for (const key of ["brand", "size", "colour"] as MultiValueFilter[]) {
      for (const value of listParam(params[key])) chips.push({ label: value, remove: { [key]: toggleListValue(params[key], value) } });
   }
   if (params.min || params.max) chips.push({ label: `${params.min || 0} – ${params.max || "∞"} Lei`, remove: { min: undefined, max: undefined } });
   if (params.stock === "1") chips.push({ label: t("inStockOnly"), remove: { stock: undefined } });
   if (params.sale === "1") chips.push({ label: t("onSaleOnly"), remove: { sale: undefined } });

   return (
      <div className="flex flex-wrap items-center gap-2 mb-4">
         {chips.map((chip) => (
            <button key={chip.label} onClick={() => navigate(chip.remove)} className="flex items-center gap-1 rounded-full bg-pink-50 text-pink-800 text-sm px-3 py-1 hover:bg-pink-100" aria-label={`${t("remove")} ${chip.label}`}>
               {chip.label}
               <X size={14} />
            </button>
         ))}
      </div>
   );
};

export default ActiveFilters;
