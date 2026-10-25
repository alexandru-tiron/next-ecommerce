"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { isStoreErrorCode, StoreErrorCode, StoreErrorParams } from "@core/errors";
import { useFormatMoney } from "@/components/common/Price";

export type StoreError = { code: StoreErrorCode; params: StoreErrorParams; details: Record<string, unknown> };

// The store error a Cloud Function call failed with (functions/src/utils/errors.ts), or null for other errors
export function storeErrorOf(error: unknown): StoreError | null {
   const details = (error as { details?: unknown } | null)?.details;
   if (!details || typeof details !== "object") return null;
   const { code, params } = details as { code?: unknown; params?: unknown };
   if (!isStoreErrorCode(code)) return null;
   return { code, params: params && typeof params === "object" ? (params as StoreErrorParams) : {}, details: details as Record<string, unknown> };
}

// Shows a store error in the visitor's language, with amounts in the store's currency
export function useStoreErrorMessage() {
   const t = useTranslations("Errors");
   const money = useFormatMoney();
   return useCallback(
      (code: StoreErrorCode, params: StoreErrorParams = {}) => {
         const values = { ...params };
         if (code === "voucher_min_order") values.minOrder = money(Number(params.minOrder));
         return t(code, values);
      },
      [t, money]
   );
}
