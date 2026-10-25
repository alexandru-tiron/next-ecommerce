import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { pickLocale } from "@core/settings";
import { LOCALE_COOKIE } from "@/lib/locale";
import { getLocalization } from "@/lib/server/storeData";

// The visitor's language: their choice from the language switcher when the store offers it, otherwise the
// store's default language (Settings/Localization). Dates use the store's time zone.
export default getRequestConfig(async () => {
   const localization = await getLocalization();
   const locale = pickLocale((await cookies()).get(LOCALE_COOKIE)?.value, localization);

   return {
      locale,
      timeZone: localization.time_zone,
      messages: (await import(`../../messages/${locale}.json`)).default,
   };
});
