import { brandPalette } from "@core/brand";
import { formatDate, formatMoney } from "@core/format";
import { Branding, isLocale, Locale, Localization, StoreInfo } from "@core/settings";
import { loadBranding, loadLocalization, loadStoreInfo } from "../utils/settings";
import { siteUrl } from "../utils/params";
import { emailMessages, EmailMessages } from "./messages";

// Everything an e-mail needs about the store: its details, colours, language, currency and links
export type EmailContext = {
   info: StoreInfo;
   locale: Locale;
   t: EmailMessages;
   site: string;
   // An image the e-mail can show; SVG logos aren't shown by most mail apps, so the store name is used instead
   logoUrl: string;
   colors: { brand: string; brandDark: string; brandLight: string };
   money: (amount: number) => string;
   date: (value: Date) => string;
};

export function emailContext(info: StoreInfo, branding: Branding, localization: Localization, site: string, locale: Locale, currency: string): EmailContext {
   const palette = brandPalette(branding.brand_color);
   const absolute = (url: string) => (url.startsWith("/") ? `${site}${url}` : url);
   const logo = branding.logo_url && !/\.svg($|\?)/i.test(decodeURIComponent(branding.logo_url)) ? absolute(branding.logo_url) : "";
   return {
      info,
      locale,
      t: emailMessages(locale),
      site,
      logoUrl: logo,
      colors: { brand: palette[700], brandDark: palette[900], brandLight: palette[50] },
      money: (amount) => formatMoney(Number(amount) || 0, currency, locale),
      date: (value) => formatDate(value, locale, localization.time_zone, { dateStyle: "long", timeStyle: "short" }),
   };
}

// Reads the settings. `locale` is the customer's language when known; otherwise the store's default language is used.
export async function loadEmailContext({ locale, currency }: { locale?: unknown; currency?: string } = {}): Promise<EmailContext> {
   const [info, branding, localization] = await Promise.all([loadStoreInfo(), loadBranding(), loadLocalization()]);
   const language = isLocale(locale) && localization.enabled_locales.includes(locale) ? locale : localization.default_locale;
   return emailContext(info, branding, localization, siteUrl.value().replace(/\/$/, ""), language, currency ?? localization.currency);
}
