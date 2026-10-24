"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { twMerge } from "tailwind-merge";
import { getTaxData } from "@/queries/fetchTaxData";
import { vatIncluded } from "@core/vat";

// "Includes VAT (21%): 294.87 Lei" under a VAT-inclusive total.
// Pass `rate` for an existing order (the rate it was placed with); otherwise the current rate from Settings/Tax is used.
const VatNote = ({ gross, rate: orderRate, className }: { gross: number; rate?: number; className?: string }) => {
   const t = useTranslations("Checkout");
   const [rate, setRate] = useState<number | null>(orderRate ?? null);

   useEffect(() => {
      if (orderRate !== undefined) {
         setRate(orderRate);
         return;
      }
      let cancelled = false;
      getTaxData().then((tax) => {
         if (!cancelled) setRate(tax.vat_rate);
      });
      return () => {
         cancelled = true;
      };
   }, [orderRate]);

   if (rate === null || rate <= 0) return null;
   return (
      <div className={twMerge("flex justify-between text-sm text-gray-500", className)}>
         <span>{t("vatIncluded", { rate })}</span>
         <span>{vatIncluded(gross, rate).toFixed(2)} Lei</span>
      </div>
   );
};

export default VatNote;
