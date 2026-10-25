import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LOCALES } from "@core/settings";
import { STORE_ERRORS } from "@core/errors";
import en from "../../messages/en.json";
import ro from "../../messages/ro.json";
import de from "../../messages/de.json";

// Every translation key the code uses must exist in every language, or next-intl shows the raw key to customers.
// Covers t("Ns.key") with useTranslations()/getTranslations() and t("key") with useTranslations("Ns").
const locales: Record<string, object> = { en, ro, de };
const srcDir = path.resolve(__dirname, "..");

const sourceFiles = (dir: string): string[] =>
   fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(full);
      return /\.tsx?$/.test(entry.name) && !entry.name.includes(".test.") ? [full] : [];
   });

const lookup = (messages: object, key: string) =>
   key.split(".").reduce<unknown>((node, part) => (node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined), messages);

function usedKeys() {
   const keys = new Map<string, string>();
   for (const file of sourceFiles(srcDir)) {
      const source = fs.readFileSync(file, "utf8");
      const translators = [...source.matchAll(/const\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(?:"([^"]*)")?\s*\)/g)];
      for (const [, name, namespace] of translators) {
         for (const [, key] of source.matchAll(new RegExp(`\\b${name}(?:\\.rich|\\.raw)?\\(\\s*"([^"]+)"`, "g"))) {
            keys.set(namespace ? `${namespace}.${key}` : key, path.relative(srcDir, file));
         }
      }
   }
   return keys;
}

describe("translations", () => {
   const keys = usedKeys();

   it("finds the keys the code uses", () => {
      expect(keys.size).toBeGreaterThan(100);
   });

   it.each(Object.keys(locales))("has every used key in %s", (locale) => {
      const missing = [...keys].filter(([key]) => lookup(locales[locale], key) === undefined).map(([key, file]) => `${key} (${file})`);
      expect(missing).toEqual([]);
   });

   it("has a messages file for every language the store offers", () => {
      expect(Object.keys(locales).sort()).toEqual([...LOCALES].sort());
   });

   // Keys built at runtime, e.g. t(`Errors.${code}`), aren't found above; matching English key for key covers them
   it.each(["ro", "de"])("has the same keys and placeholders in %s as in English", (locale) => {
      const differences = flatten(en)
         .filter(([key, text]) => {
            const translated = lookup(locales[locale], key);
            return typeof translated !== "string" || placeholders(translated) !== placeholders(text);
         })
         .map(([key]) => key);
      const extra = flatten(locales[locale])
         .filter(([key]) => lookup(en, key) === undefined)
         .map(([key]) => key);
      expect([...differences, ...extra]).toEqual([]);
   });

   it("has a message for every error the server can return", () => {
      expect(Object.keys(en.Errors).sort()).toEqual(Object.keys(STORE_ERRORS).sort());
   });
});

function flatten(messages: object, prefix = ""): [string, string][] {
   return Object.entries(messages).flatMap(([key, value]) => (typeof value === "string" ? [[`${prefix}${key}`, value] as [string, string]] : flatten(value, `${prefix}${key}.`)));
}

// The {name} arguments of an ICU message, e.g. "{count, plural, ...}" -> "count"
const placeholders = (text: string) => [...text.matchAll(/\{([\w.]+)[,}]/g)].map((match) => match[1]).sort().join(",");
