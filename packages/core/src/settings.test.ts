import { describe, expect, it } from "vitest";
import { analyticsFrom, brandingFrom, homeFrom, infoPageFrom, localizationFrom, navigationFrom, pickLocale, storeInfoFrom, systemFrom } from "./settings";
import { formatDate, formatMoney, moneyParts } from "./format";

describe("settings", () => {
   it("fill in missing documents with the defaults", () => {
      expect(storeInfoFrom(undefined).store_name).toBe("My Store");
      expect(brandingFrom(null).brand_color).toBe("#be185d");
      expect(localizationFrom(undefined)).toEqual({ default_locale: "en", enabled_locales: ["en"], currency: "EUR", time_zone: "Europe/Berlin" });
      expect(analyticsFrom(undefined).provider).toBe("none");
   });

   it("ignore invalid values", () => {
      expect(brandingFrom({ brand_color: "red", font: "comic", logo_url: "javascript:alert(1)" })).toMatchObject({ brand_color: "#be185d", font: "inter", logo_url: "" });
      expect(localizationFrom({ default_locale: "fr", currency: "euro", time_zone: "Mars/Base" })).toMatchObject({ default_locale: "en", currency: "EUR", time_zone: "Europe/Berlin" });
   });

   it("always offer the default language", () => {
      expect(localizationFrom({ default_locale: "de", enabled_locales: ["en"] }).enabled_locales).toEqual(["de", "en"]);
   });

   it("pick the visitor's language only when the store offers it", () => {
      const localization = localizationFrom({ default_locale: "ro", enabled_locales: ["ro", "en"] });
      expect(pickLocale("en", localization)).toBe("en");
      expect(pickLocale("de", localization)).toBe("ro");
      expect(pickLocale(undefined, localization)).toBe("ro");
   });

   it("keep the saved home section order and add new sections at the end", () => {
      const home = homeFrom({ sections: [{ id: "brands", enabled: false }, { id: "slider" }, { id: "brands" }, { id: "unknown" }] });
      expect(home.sections.slice(0, 2)).toEqual([
         { id: "brands", enabled: false },
         { id: "slider", enabled: true },
      ]);
      expect(home.sections).toHaveLength(8);
   });

   it("keep only safe footer links with a label", () => {
      const nav = navigationFrom({ footer_links: [{ url: "javascript:alert(1)", label: { en: "x" } }, { url: "/info/contact", label: { en: "Contact", de: "" } }, { url: "/x", label: {} }] });
      expect(nav.footer_links).toEqual([{ url: "/info/contact", label: { en: "Contact" } }]);
   });

   it("turn analytics off without an id", () => {
      expect(analyticsFrom({ provider: "ga4", ga4_id: "" }).provider).toBe("none");
      expect(analyticsFrom({ provider: "ga4", ga4_id: "G-ABC123" })).toMatchObject({ provider: "ga4", ga4_id: "G-ABC123" });
   });

   it("keep page content only for known languages", () => {
      expect(infoPageFrom({ content: { en: "<p>Hi</p>", fr: "<p>Salut</p>", de: " " } })).toEqual({ content: { en: "<p>Hi</p>" } });
   });
});

describe("formatting", () => {
   it("formats prices in the store currency and language", () => {
      expect(formatMoney(1599.5, "EUR", "de")).toMatch(/1\.599,50\s€/);
      expect(formatMoney(1599.5, "RON", "ro")).toMatch(/1\.599,50\sRON/);
      expect(formatMoney(1599.5, "USD", "en")).toBe("$1,599.50");
   });

   it("splits a price into parts for the price display", () => {
      expect(moneyParts(799, "EUR", "de")).toMatchObject({ whole: "799", fraction: "00", currency: "€", currencyFirst: false });
      expect(moneyParts(1599.5, "USD", "en")).toMatchObject({ whole: "1,599", fraction: "50", currency: "$", currencyFirst: true });
   });

   it("formats dates in the store time zone", () => {
      expect(formatDate("2026-01-01T23:30:00Z", "en", "Europe/Bucharest", { dateStyle: "short" })).toBe("1/2/26");
      expect(formatDate("not a date", "en", "UTC")).toBe("");
   });
});

describe("system settings", () => {
   it("use the saved setup flag, and treat older stores with a name as set up", () => {
      expect(systemFrom({ setup_completed: true })).toEqual({ setup_completed: true });
      expect(systemFrom({ setup_completed: false }, storeInfoFrom({ store_name: "Shop" }))).toEqual({ setup_completed: false });
      expect(systemFrom(null, storeInfoFrom({ store_name: "Shop" }))).toEqual({ setup_completed: true });
      expect(systemFrom(null, storeInfoFrom(null))).toEqual({ setup_completed: false });
   });
});
