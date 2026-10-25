"use client";

import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { HomeLayout, LOCALE_NAMES, Locale, Navigation, NavLink } from "@core/settings";

const inputClass = "mt-1 px-3 py-2 block w-full rounded-md border border-gray-300 shadow-sm sm:text-sm";

// Home & footer tab of Admin → Settings: the home page sections (Settings/Home) and extra footer links (Settings/Navigation)
export default function HomeNavigationForm({ home, onHomeChange, navigation, onNavigationChange, locales }: { home: HomeLayout; onHomeChange: (home: HomeLayout) => void; navigation: Navigation; onNavigationChange: (navigation: Navigation) => void; locales: Locale[] }) {
   const t = useTranslations("StoreSettings");

   const move = (index: number, by: number) => {
      const sections = [...home.sections];
      [sections[index], sections[index + by]] = [sections[index + by], sections[index]];
      onHomeChange({ sections });
   };
   const links = navigation.footer_links;
   const setLink = (index: number, link: NavLink) => onNavigationChange({ footer_links: links.map((item, i) => (i === index ? link : item)) });

   return (
      <div className="space-y-10">
         <section>
            <h3 className="text-lg font-medium text-gray-900">{t("homeSections")}</h3>
            <p className="mt-1 text-sm text-gray-500">{t("homeSectionsHint")}</p>
            <ol className="mt-4 max-w-xl border border-gray-200 rounded-md divide-y divide-gray-200">
               {home.sections.map((section, index) => (
                  <li key={section.id} className="flex items-center justify-between gap-3 px-4 py-3">
                     <label className="flex items-center gap-3 text-sm text-gray-800">
                        <input type="checkbox" checked={section.enabled} onChange={(e) => onHomeChange({ sections: home.sections.map((item) => (item.id === section.id ? { ...item, enabled: e.target.checked } : item)) })} className="h-4 w-4 border-gray-300 rounded" />
                        <span className={section.enabled ? "" : "text-gray-400"}>{t(`sections.${section.id}`)}</span>
                     </label>
                     <span className="flex gap-1">
                        <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30" title={t("moveUp")} aria-label={t("moveUp")}>
                           <ArrowUp className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => move(index, 1)} disabled={index === home.sections.length - 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30" title={t("moveDown")} aria-label={t("moveDown")}>
                           <ArrowDown className="h-4 w-4" />
                        </button>
                     </span>
                  </li>
               ))}
            </ol>
         </section>

         <section>
            <div className="flex items-center justify-between gap-4">
               <div>
                  <h3 className="text-lg font-medium text-gray-900">{t("footerLinks")}</h3>
                  <p className="mt-1 text-sm text-gray-500">{t("footerLinksHint")}</p>
               </div>
               <button
                  type="button"
                  onClick={() => onNavigationChange({ footer_links: [...links, { url: "", label: {} }] })}
                  disabled={links.length >= 20}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 disabled:opacity-50 flex-shrink-0"
               >
                  <Plus className="h-4 w-4 mr-1" /> {t("addLink")}
               </button>
            </div>
            <div className="mt-4 space-y-4">
               {links.length === 0 && <p className="text-sm text-gray-500">{t("noFooterLinks")}</p>}
               {links.map((link, index) => (
                  <div key={index} className="grid grid-cols-1 gap-4 rounded-md border border-gray-200 p-4 md:grid-cols-[1fr_1fr_auto]">
                     <div>
                        <label htmlFor={`linkUrl${index}`} className="block text-sm font-medium text-gray-700">
                           {t("linkUrl")}
                        </label>
                        <input id={`linkUrl${index}`} value={link.url} onChange={(e) => setLink(index, { ...link, url: e.target.value })} placeholder="https://" className={inputClass} />
                        <p className="mt-1 text-xs text-gray-500">{t("linkUrlHint")}</p>
                     </div>
                     <div className="space-y-2">
                        {locales.map((locale) => (
                           <div key={locale}>
                              <label htmlFor={`linkLabel${index}${locale}`} className="block text-sm font-medium text-gray-700">
                                 {t("linkLabel", { language: LOCALE_NAMES[locale] })}
                              </label>
                              <input id={`linkLabel${index}${locale}`} value={link.label[locale] ?? ""} onChange={(e) => setLink(index, { ...link, label: { ...link.label, [locale]: e.target.value } })} maxLength={60} className={inputClass} />
                           </div>
                        ))}
                     </div>
                     <button type="button" onClick={() => onNavigationChange({ footer_links: links.filter((_, i) => i !== index) })} className="self-start p-2 rounded-md text-red-600 hover:bg-red-50" title={t("removeLink")} aria-label={t("removeLink")}>
                        <Trash2 className="h-4 w-4" />
                     </button>
                  </div>
               ))}
            </div>
         </section>
      </div>
   );
}
