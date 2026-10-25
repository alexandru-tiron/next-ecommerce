"use client";

import { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { brandContrastOk, brandPalette, SHADES } from "@core/brand";
import { Branding, DEFAULT_BRAND_COLOR, FONTS, isHexColor, RADII } from "@core/settings";
import { FONT_STACKS, RADIUS_SCALE } from "@/lib/branding";
import ImageUploadField from "./ImageUploadField";

const inputClass = "mt-1 px-3 py-2 block w-full rounded-md border border-gray-300 shadow-sm sm:text-sm";

// Branding tab of Admin → Settings, saved with the other settings into Settings/Branding
export default function BrandingSettingsForm({ settings, onChange }: { settings: Branding; onChange: (settings: Branding) => void }) {
   const t = useTranslations("StoreSettings");
   const set = <K extends keyof Branding>(key: K, value: Branding[K]) => onChange({ ...settings, [key]: value });
   const color = isHexColor(settings.brand_color) ? settings.brand_color : DEFAULT_BRAND_COLOR;
   const palette = brandPalette(color);
   // The preview uses the same custom properties the root layout sets for the whole store
   const previewStyle = {
      ...Object.fromEntries(SHADES.map((shade) => [`--brand-${shade}`, palette[shade]])),
      "--store-radius": RADIUS_SCALE[settings.radius],
      "--store-font": FONT_STACKS[settings.font],
   } as CSSProperties;

   return (
      <div className="space-y-8">
         <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <ImageUploadField id="logo" label={t("logo")} hint={t("logoHint")} value={settings.logo_url} onChange={(url) => set("logo_url", url)} accept="image/svg+xml,image/png,image/webp" />
            <ImageUploadField id="favicon" label={t("favicon")} hint={t("faviconHint")} value={settings.favicon_url} onChange={(url) => set("favicon_url", url)} accept="image/png,image/svg+xml,image/x-icon,.ico" previewClassName="h-16 w-16" />
            <ImageUploadField id="share" label={t("shareImage")} hint={t("shareImageHint")} value={settings.share_image_url} onChange={(url) => set("share_image_url", url)} accept="image/jpeg,image/png,image/webp" previewClassName="h-16 w-32" />
         </div>

         <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-6">
               <div>
                  <label htmlFor="brandColor" className="block text-sm font-medium text-gray-700">
                     {t("brandColor")}
                  </label>
                  <div className="mt-1 flex items-center gap-3">
                     <input type="color" value={color} onChange={(e) => set("brand_color", e.target.value)} className="h-10 w-14 cursor-pointer rounded border border-gray-300 bg-white p-1" aria-label={t("brandColor")} />
                     <input id="brandColor" value={settings.brand_color} onChange={(e) => set("brand_color", e.target.value.trim())} maxLength={7} className="px-3 py-2 w-28 rounded-md border border-gray-300 shadow-sm sm:text-sm font-mono" />
                     {color !== DEFAULT_BRAND_COLOR && (
                        <button type="button" onClick={() => set("brand_color", DEFAULT_BRAND_COLOR)} className="text-sm text-gray-500 hover:text-gray-700 underline">
                           {t("resetColor")}
                        </button>
                     )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{t("brandColorHint")}</p>
                  <div className="mt-3 flex overflow-hidden rounded-md border border-gray-200" aria-label={t("palettePreview")}>
                     {SHADES.map((shade) => (
                        <div key={shade} className="flex-1 h-10 flex items-end justify-center pb-0.5 text-[10px]" style={{ background: palette[shade], color: shade >= 500 ? "#fff" : "#111" }}>
                           {shade}
                        </div>
                     ))}
                  </div>
                  {!brandContrastOk(color) && (
                     <p className="mt-2 flex items-center gap-1.5 text-sm text-amber-700">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        {t("contrastWarning")}
                     </p>
                  )}
               </div>

               <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                     <label htmlFor="font" className="block text-sm font-medium text-gray-700">
                        {t("font")}
                     </label>
                     <select id="font" value={settings.font} onChange={(e) => set("font", e.target.value as Branding["font"])} className={inputClass}>
                        {FONTS.map((font) => (
                           <option key={font} value={font}>
                              {t(`fonts.${font}`)}
                           </option>
                        ))}
                     </select>
                  </div>
                  <div>
                     <label htmlFor="radius" className="block text-sm font-medium text-gray-700">
                        {t("radius")}
                     </label>
                     <select id="radius" value={settings.radius} onChange={(e) => set("radius", e.target.value as Branding["radius"])} className={inputClass}>
                        {RADII.map((radius) => (
                           <option key={radius} value={radius}>
                              {t(`radii.${radius}`)}
                           </option>
                        ))}
                     </select>
                  </div>
               </div>
            </div>

            <div>
               <span className="block text-sm font-medium text-gray-700">{t("preview")}</span>
               <div style={previewStyle} className="mt-1 font-sans rounded-lg border border-gray-200 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                     {/* eslint-disable-next-line @next/next/no-img-element -- any size or format, including SVG */}
                     {settings.logo_url ? <img src={settings.logo_url} alt="" className="h-8 max-w-40 object-contain" /> : <span className="text-xl font-semibold">{t("previewStoreName")}</span>}
                     <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-800">{t("previewBadge")}</span>
                  </div>
                  <div className="rounded-xl border border-gray-100 p-4 space-y-2">
                     <p className="font-medium text-gray-900">{t("previewProduct")}</p>
                     <p className="text-lg font-semibold text-brand-700">49.90</p>
                     <p className="text-sm text-gray-600">
                        {t("previewText")}{" "}
                        <a href="#" onClick={(e) => e.preventDefault()} className="text-brand-700 underline">
                           {t("previewLink")}
                        </a>
                     </p>
                     <button type="button" className="w-full rounded-md bg-brand-700 py-2 text-sm font-medium text-white hover:bg-brand-800">
                        {t("previewButton")}
                     </button>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}
