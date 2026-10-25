"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Globe } from "lucide-react";
import { LOCALE_NAMES, Locale } from "@core/settings";
import { LOCALE_COOKIE } from "@/lib/locale";
import { useStoreSettings } from "@/components/StoreSettingsProvider";

// Shown when the store offers more than one language. The choice is kept in a cookie for a year.
export default function LanguageSwitcher({ className = "" }: { className?: string }) {
   const locale = useLocale();
   const router = useRouter();
   const t = useTranslations("Navbar");
   const [isPending, startTransition] = useTransition();
   const { localization } = useStoreSettings();
   if (localization.enabled_locales.length < 2) return null;

   const change = (next: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      startTransition(() => router.refresh());
   };

   return (
      <label className={`flex items-center gap-1 text-sm text-gray-700 ${className}`}>
         <Globe className="size-4" aria-hidden="true" />
         <span className="sr-only">{t("language")}</span>
         <select value={locale} onChange={(event) => change(event.target.value as Locale)} disabled={isPending} className="bg-transparent cursor-pointer outline-none">
            {localization.enabled_locales.map((code) => (
               <option key={code} value={code}>
                  {LOCALE_NAMES[code]}
               </option>
            ))}
         </select>
      </label>
   );
}
