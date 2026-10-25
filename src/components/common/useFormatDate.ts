"use client";

import { useLocale } from "next-intl";
import { useCallback } from "react";
import { formatDate } from "@core/format";
import { useStoreFormat } from "@/components/StoreSettingsProvider";

// Formats dates in the visitor's language and the store's time zone (Settings → Localization)
export function useFormatDate() {
   const locale = useLocale();
   const { timeZone } = useStoreFormat();
   return useCallback((value: Date | string | number, options?: Intl.DateTimeFormatOptions) => formatDate(value, locale, timeZone, options), [locale, timeZone]);
}
