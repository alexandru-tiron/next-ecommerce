"use client";

import { createContext, ReactNode, useContext } from "react";
import { Analytics, DEFAULT_ANALYTICS, DEFAULT_LOCALIZATION, DEFAULT_STORE_INFO, Locale, Localization } from "@core/settings";

// The store settings client components need, read on the server by the root layout
export type ClientStoreSettings = {
   storeName: string;
   logoUrl: string;
   localization: Localization;
   analytics: Analytics;
};

const StoreSettingsContext = createContext<ClientStoreSettings>({
   storeName: DEFAULT_STORE_INFO.store_name,
   logoUrl: "",
   localization: DEFAULT_LOCALIZATION,
   analytics: DEFAULT_ANALYTICS,
});

export function StoreSettingsProvider({ value, children }: { value: ClientStoreSettings; children: ReactNode }) {
   return <StoreSettingsContext.Provider value={value}>{children}</StoreSettingsContext.Provider>;
}

export const useStoreSettings = () => useContext(StoreSettingsContext);

// The store's currency and time zone, for formatting in client components
export function useStoreFormat(): { currency: string; timeZone: string; defaultLocale: Locale } {
   const { localization } = useStoreSettings();
   return { currency: localization.currency, timeZone: localization.time_zone, defaultLocale: localization.default_locale };
}
