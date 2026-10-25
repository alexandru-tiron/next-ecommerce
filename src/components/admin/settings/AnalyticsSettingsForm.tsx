"use client";

import { useTranslations } from "next-intl";
import { Analytics, analyticsFrom, ANALYTICS_PROVIDERS } from "@core/settings";

const inputClass = "mt-1 px-3 py-2 block w-full rounded-md border border-gray-300 shadow-sm sm:text-sm";

// Analytics section of the General tab, saved into Settings/Analytics
export default function AnalyticsSettingsForm({ settings, onChange }: { settings: Analytics; onChange: (settings: Analytics) => void }) {
   const t = useTranslations("StoreSettings");
   // What will actually load after saving: a provider without a valid id stays off
   const invalid = settings.provider !== "none" && analyticsFrom(settings).provider === "none";

   return (
      <section className="space-y-4">
         <div>
            <h3 className="text-lg font-medium text-gray-900">{t("analyticsTitle")}</h3>
            <p className="mt-1 text-sm text-gray-500">{t("analyticsHint")}</p>
         </div>
         <div className="flex flex-wrap gap-6">
            {ANALYTICS_PROVIDERS.map((provider) => (
               <label key={provider} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="radio" name="analyticsProvider" checked={settings.provider === provider} onChange={() => onChange({ ...settings, provider })} className="h-4 w-4 border-gray-300" />
                  {t(`analyticsProviders.${provider}`)}
               </label>
            ))}
         </div>
         <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {settings.provider === "ga4" && (
               <div>
                  <label htmlFor="ga4Id" className="block text-sm font-medium text-gray-700">
                     {t("ga4Id")}
                  </label>
                  <input id="ga4Id" value={settings.ga4_id} onChange={(e) => onChange({ ...settings, ga4_id: e.target.value.trim().toUpperCase() })} placeholder="G-XXXXXXXXXX" className={`${inputClass} font-mono`} />
               </div>
            )}
            {settings.provider === "plausible" && (
               <div>
                  <label htmlFor="plausibleDomain" className="block text-sm font-medium text-gray-700">
                     {t("plausibleDomain")}
                  </label>
                  <input id="plausibleDomain" value={settings.plausible_domain} onChange={(e) => onChange({ ...settings, plausible_domain: e.target.value.trim().toLowerCase() })} placeholder="shop.example.com" className={`${inputClass} font-mono`} />
               </div>
            )}
         </div>
         {invalid && <p className="text-sm text-amber-700">{t("analyticsInvalid")}</p>}
      </section>
   );
}
