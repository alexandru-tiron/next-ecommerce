// The store settings documents in Firestore (Settings/*), with the defaults a new store starts with.
// Each *From() function turns a stored document, which may be missing or come from an older version, into a complete value.

export const LOCALES = ["en", "ro", "de"] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", ro: "Română", de: "Deutsch" };
export const isLocale = (value: unknown): value is Locale => LOCALES.includes(value as Locale);

// Currencies offered in the admin panel. NETOPIA only takes RON; Stripe takes all of them.
export const CURRENCIES = ["EUR", "RON", "USD", "GBP", "CHF", "PLN", "HUF", "BGN", "CZK", "SEK", "DKK", "NOK"] as const;
export const isCurrency = (value: unknown): value is string => typeof value === "string" && /^[A-Z]{3}$/.test(value);

const text = (value: unknown, fallback = "") => (typeof value === "string" ? value.trim() : fallback);
const url = (value: unknown) => {
   const candidate = text(value);
   return /^https:\/\//.test(candidate) || candidate.startsWith("/") ? candidate : "";
};

// Settings/Info: who the store is (shown in the footer, legal pages, e-mails and invoices)
export type StoreInfo = {
   store_name: string;
   legal_name: string;
   tax_id: string;
   reg_no: string;
   store_address: string;
   country: string;
   phone_no: string;
   contact_mail: string;
   orders_mail: string;
   support_mail: string;
   facebook_link: string;
   instagram_link: string;
   x_link: string;
   pinterest_link: string;
};

export const DEFAULT_STORE_INFO: StoreInfo = {
   store_name: "My Store",
   legal_name: "",
   tax_id: "",
   reg_no: "",
   store_address: "",
   country: "",
   phone_no: "",
   contact_mail: "",
   orders_mail: "",
   support_mail: "",
   facebook_link: "",
   instagram_link: "",
   x_link: "",
   pinterest_link: "",
};

export function storeInfoFrom(data: Partial<Record<keyof StoreInfo, unknown>> | null | undefined): StoreInfo {
   const info = { ...DEFAULT_STORE_INFO };
   for (const key of Object.keys(DEFAULT_STORE_INFO) as (keyof StoreInfo)[]) info[key] = text(data?.[key], DEFAULT_STORE_INFO[key]);
   if (!info.store_name) info.store_name = DEFAULT_STORE_INFO.store_name;
   return info;
}

// Settings/Shipping: a flat price, free above a threshold when it's switched on
export type ShippingSettings = { default_price: number; enable_threshold: boolean; free_shipping_threshold: number };
export const DEFAULT_SHIPPING: ShippingSettings = { default_price: 25, enable_threshold: false, free_shipping_threshold: 500 };

const amount = (value: unknown, fallback: number) => (typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback);

export function shippingFrom(data: Partial<Record<keyof ShippingSettings, unknown>> | null | undefined): ShippingSettings {
   return {
      default_price: amount(data?.default_price, DEFAULT_SHIPPING.default_price),
      enable_threshold: data?.enable_threshold === true,
      free_shipping_threshold: amount(data?.free_shipping_threshold, DEFAULT_SHIPPING.free_shipping_threshold),
   };
}

// What shipping costs for a products subtotal
export const shippingCost = (settings: ShippingSettings, subtotal: number) => (settings.enable_threshold && subtotal >= settings.free_shipping_threshold ? 0 : settings.default_price);

// Settings/Notifications: which e-mails the store sends
export type NotificationSettings = { send_new_order_mails: boolean; send_order_status_update_mails: boolean; send_confirmation_mails: boolean };
export const DEFAULT_NOTIFICATIONS: NotificationSettings = { send_new_order_mails: true, send_order_status_update_mails: false, send_confirmation_mails: true };

export function notificationsFrom(data: Partial<Record<keyof NotificationSettings, unknown>> | null | undefined): NotificationSettings {
   const flag = (key: keyof NotificationSettings) => (typeof data?.[key] === "boolean" ? (data[key] as boolean) : DEFAULT_NOTIFICATIONS[key]);
   return { send_new_order_mails: flag("send_new_order_mails"), send_order_status_update_mails: flag("send_order_status_update_mails"), send_confirmation_mails: flag("send_confirmation_mails") };
}

// Settings/Branding
export const FONTS = ["inter", "poppins", "lora", "system"] as const;
export type Font = (typeof FONTS)[number];
export const RADII = ["none", "small", "medium", "large"] as const;
export type Radius = (typeof RADII)[number];

export type Branding = {
   logo_url: string;
   favicon_url: string;
   share_image_url: string;
   brand_color: string;
   font: Font;
   radius: Radius;
};

// The pink the store was designed with
export const DEFAULT_BRAND_COLOR = "#be185d";
export const DEFAULT_BRANDING: Branding = { logo_url: "", favicon_url: "", share_image_url: "", brand_color: DEFAULT_BRAND_COLOR, font: "inter", radius: "medium" };
export const isHexColor = (value: unknown): value is string => typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);

export function brandingFrom(data: Partial<Record<keyof Branding, unknown>> | null | undefined): Branding {
   return {
      logo_url: url(data?.logo_url),
      favicon_url: url(data?.favicon_url),
      share_image_url: url(data?.share_image_url),
      brand_color: isHexColor(data?.brand_color) ? data.brand_color.toLowerCase() : DEFAULT_BRAND_COLOR,
      font: FONTS.includes(data?.font as Font) ? (data?.font as Font) : DEFAULT_BRANDING.font,
      radius: RADII.includes(data?.radius as Radius) ? (data?.radius as Radius) : DEFAULT_BRANDING.radius,
   };
}

// Settings/Localization
export type Localization = {
   default_locale: Locale;
   enabled_locales: Locale[];
   currency: string;
   time_zone: string;
};

export const DEFAULT_LOCALIZATION: Localization = { default_locale: "en", enabled_locales: ["en"], currency: "EUR", time_zone: "Europe/Berlin" };

export function localizationFrom(data: Partial<Record<keyof Localization, unknown>> | null | undefined): Localization {
   const defaultLocale = isLocale(data?.default_locale) ? data.default_locale : DEFAULT_LOCALIZATION.default_locale;
   const enabled = Array.isArray(data?.enabled_locales) ? LOCALES.filter((locale) => (data.enabled_locales as unknown[]).includes(locale)) : [];
   const timeZone = text(data?.time_zone);
   return {
      default_locale: defaultLocale,
      // The default language is always offered
      enabled_locales: enabled.includes(defaultLocale) ? enabled : [defaultLocale, ...enabled],
      currency: isCurrency(data?.currency) ? data.currency : DEFAULT_LOCALIZATION.currency,
      time_zone: timeZone && isTimeZone(timeZone) ? timeZone : DEFAULT_LOCALIZATION.time_zone,
   };
}

function isTimeZone(zone: string) {
   try {
      new Intl.DateTimeFormat("en", { timeZone: zone });
      return true;
   } catch {
      return false;
   }
}

// The language a visitor sees: their choice when the store offers it, otherwise the store's default
export function pickLocale(requested: unknown, localization: Localization): Locale {
   return isLocale(requested) && localization.enabled_locales.includes(requested) ? requested : localization.default_locale;
}

// Settings/Home: the home page sections, in order
export const HOME_SECTIONS = ["slider", "categories", "bestSellers", "productOfTheMonth", "whyChooseUs", "newArrivals", "recentlyViewed", "brands"] as const;
export type HomeSectionId = (typeof HOME_SECTIONS)[number];
export type HomeSection = { id: HomeSectionId; enabled: boolean };
export type HomeLayout = { sections: HomeSection[] };

export const DEFAULT_HOME: HomeLayout = { sections: HOME_SECTIONS.map((id) => ({ id, enabled: true })) };

export function homeFrom(data: { sections?: unknown } | null | undefined): HomeLayout {
   const stored = Array.isArray(data?.sections) ? (data.sections as { id?: unknown; enabled?: unknown }[]) : [];
   const sections: HomeSection[] = [];
   for (const section of stored) {
      if (HOME_SECTIONS.includes(section?.id as HomeSectionId) && !sections.some((item) => item.id === section.id)) {
         sections.push({ id: section.id as HomeSectionId, enabled: section.enabled !== false });
      }
   }
   // Sections added in a newer version appear at the end
   for (const id of HOME_SECTIONS) if (!sections.some((item) => item.id === id)) sections.push({ id, enabled: true });
   return { sections };
}

// Settings/Navigation: extra footer links, with a label per language
export type NavLink = { label: Partial<Record<Locale, string>>; url: string };
export type Navigation = { footer_links: NavLink[] };
export const DEFAULT_NAVIGATION: Navigation = { footer_links: [] };

export function navigationFrom(data: { footer_links?: unknown } | null | undefined): Navigation {
   const links = Array.isArray(data?.footer_links) ? (data.footer_links as { label?: unknown; url?: unknown }[]) : [];
   return {
      footer_links: links
         .map((link) => ({
            url: /^(https:\/\/|\/|mailto:)/.test(text(link?.url)) ? text(link?.url) : "",
            label: Object.fromEntries(LOCALES.map((locale) => [locale, text((link?.label as Record<string, unknown> | undefined)?.[locale])]).filter(([, label]) => label)),
         }))
         .filter((link) => link.url && Object.keys(link.label).length > 0)
         .slice(0, 20),
   };
}

export const linkLabel = (link: NavLink, locale: Locale, fallback: Locale) => link.label[locale] || link.label[fallback] || Object.values(link.label)[0] || link.url;

// Settings/Analytics: off until the owner picks a provider; visitors still have to consent
export const ANALYTICS_PROVIDERS = ["none", "ga4", "plausible"] as const;
export type AnalyticsProvider = (typeof ANALYTICS_PROVIDERS)[number];
export type Analytics = { provider: AnalyticsProvider; ga4_id: string; plausible_domain: string };
export const DEFAULT_ANALYTICS: Analytics = { provider: "none", ga4_id: "", plausible_domain: "" };

export function analyticsFrom(data: Partial<Record<keyof Analytics, unknown>> | null | undefined): Analytics {
   const provider = ANALYTICS_PROVIDERS.includes(data?.provider as AnalyticsProvider) ? (data?.provider as AnalyticsProvider) : "none";
   const ga4Id = /^G-[A-Z0-9]{4,20}$/.test(text(data?.ga4_id)) ? text(data?.ga4_id) : "";
   const plausibleDomain = /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(text(data?.plausible_domain)) ? text(data?.plausible_domain) : "";
   // A provider without its id stays off
   if ((provider === "ga4" && !ga4Id) || (provider === "plausible" && !plausibleDomain)) return { ...DEFAULT_ANALYTICS };
   return { provider, ga4_id: ga4Id, plausible_domain: plausibleDomain };
}

// Settings/Legal/Pages/{page}: the store's information pages, one HTML text per language
export const INFO_PAGES = ["about-us", "how-to-buy", "delivery-and-payment", "return", "terms-and-conditions", "privacy-policy"] as const;
export type InfoPageId = (typeof INFO_PAGES)[number];
export const isInfoPage = (value: unknown): value is InfoPageId => INFO_PAGES.includes(value as InfoPageId);
export type InfoPage = { content: Partial<Record<Locale, string>> };

export function infoPageFrom(data: Record<string, unknown> | null | undefined): InfoPage {
   const content = (data?.content ?? {}) as Record<string, unknown>;
   return { content: Object.fromEntries(LOCALES.filter((locale) => typeof content[locale] === "string" && (content[locale] as string).trim()).map((locale) => [locale, content[locale] as string])) };
}

// Settings/System: whether the setup wizard (/setup) has been finished. A finished setup can't be claimed again.
// Stores set up before the wizard existed have no document; they count as set up once they have a store name.
export type SystemSettings = { setup_completed: boolean };

export function systemFrom(data: Record<string, unknown> | null | undefined, info?: StoreInfo): SystemSettings {
   if (typeof data?.setup_completed === "boolean") return { setup_completed: data.setup_completed };
   return { setup_completed: Boolean(info && info.store_name !== DEFAULT_STORE_INFO.store_name) };
}
