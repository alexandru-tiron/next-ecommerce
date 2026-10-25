"use client";

import { useLocale } from "next-intl";
import { useCallback } from "react";
import { formatMoney, moneyParts } from "@core/format";
import { useStoreFormat } from "@/components/StoreSettingsProvider";

// Formats amounts in the store's currency (Settings → Localization) and the visitor's language
export function useFormatMoney() {
   const locale = useLocale();
   const { currency } = useStoreFormat();
   return useCallback((amount: number) => formatMoney(Number(amount) || 0, currency, locale), [currency, locale]);
}

// An amount as plain text, e.g. "1.599,00 lei" or "€1,599.00"
export function Money({ amount }: { amount: number }) {
   return <>{useFormatMoney()(amount)}</>;
}

// The store's large price style: whole units, the decimals raised and smaller, and the currency symbol where the language puts it
export function PriceTag({ amount, supClassName = "text-xs leading-none -top-2", currencyClassName = "" }: { amount: number; supClassName?: string; currencyClassName?: string }) {
   const locale = useLocale();
   const { currency } = useStoreFormat();
   const parts = moneyParts(Number(amount) || 0, currency, locale);
   const symbol = <span className={currencyClassName}>{parts.currency}</span>;
   return (
      <>
         {parts.currencyFirst && symbol}
         {parts.whole}
         {parts.fraction && <sup className={supClassName}>{parts.fraction}</sup>}
         {!parts.currencyFirst && <> {symbol}</>}
      </>
   );
}
