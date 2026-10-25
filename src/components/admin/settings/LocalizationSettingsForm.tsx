"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { CURRENCIES, LOCALE_NAMES, LOCALES, Locale, Localization } from "@core/settings";

const inputClass = "mt-1 px-3 py-2 block w-full rounded-md border border-gray-300 shadow-sm sm:text-sm";

function timeZones(current: string) {
   const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
   return zones.includes(current) ? zones : [current, ...zones];
}

// Languages & currency tab of Admin → Settings, saved with the other settings into Settings/Localization
export default function LocalizationSettingsForm({ settings, onChange }: { settings: Localization; onChange: (settings: Localization) => void }) {
   const t = useTranslations("StoreSettings");
   const zones = useMemo(() => timeZones(settings.time_zone), [settings.time_zone]);
   const currencyNames = useMemo(() => new Intl.DisplayNames(undefined, { type: "currency" }), []);

   const setDefault = (locale: Locale) => onChange({ ...settings, default_locale: locale, enabled_locales: settings.enabled_locales.includes(locale) ? settings.enabled_locales : [...settings.enabled_locales, locale] });
   const toggle = (locale: Locale, enabled: boolean) => onChange({ ...settings, enabled_locales: LOCALES.filter((item) => (item === locale ? enabled : settings.enabled_locales.includes(item))) });

   return (
      <div className="space-y-8">
         <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
               <label htmlFor="defaultLocale" className="block text-sm font-medium text-gray-700">
                  {t("defaultLanguage")}
               </label>
               <select id="defaultLocale" value={settings.default_locale} onChange={(e) => setDefault(e.target.value as Locale)} className={inputClass}>
                  {LOCALES.map((locale) => (
                     <option key={locale} value={locale}>
                        {LOCALE_NAMES[locale]}
                     </option>
                  ))}
               </select>
               <p className="mt-1 text-xs text-gray-500">{t("defaultLanguageHint")}</p>
            </div>

            <fieldset>
               <legend className="block text-sm font-medium text-gray-700">{t("languages")}</legend>
               <div className="mt-2 space-y-2">
                  {LOCALES.map((locale) => (
                     <label key={locale} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                           type="checkbox"
                           checked={settings.enabled_locales.includes(locale)}
                           disabled={locale === settings.default_locale}
                           onChange={(e) => toggle(locale, e.target.checked)}
                           className="h-4 w-4 border-gray-300 rounded disabled:opacity-50"
                        />
                        {LOCALE_NAMES[locale]}
                     </label>
                  ))}
               </div>
               <p className="mt-1 text-xs text-gray-500">{t("languagesHint")}</p>
            </fieldset>

            <div>
               <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
                  {t("currency")}
               </label>
               <select id="currency" value={settings.currency} onChange={(e) => onChange({ ...settings, currency: e.target.value })} className={inputClass}>
                  {(CURRENCIES as readonly string[]).includes(settings.currency) ? null : <option value={settings.currency}>{settings.currency}</option>}
                  {CURRENCIES.map((currency) => (
                     <option key={currency} value={currency}>
                        {currency} – {currencyNames.of(currency)}
                     </option>
                  ))}
               </select>
               <p className="mt-1 text-xs text-gray-500">{t("currencyHint")}</p>
               {settings.currency !== "RON" && <p className="mt-1 text-xs text-gray-500">{t("netopiaRonOnly")}</p>}
            </div>

            <div>
               <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">
                  {t("timeZone")}
               </label>
               <select id="timeZone" value={settings.time_zone} onChange={(e) => onChange({ ...settings, time_zone: e.target.value })} className={inputClass}>
                  {zones.map((zone) => (
                     <option key={zone} value={zone}>
                        {zone.replace(/_/g, " ")}
                     </option>
                  ))}
               </select>
               <p className="mt-1 text-xs text-gray-500">{t("timeZoneHint")}</p>
            </div>
         </div>
      </div>
   );
}
