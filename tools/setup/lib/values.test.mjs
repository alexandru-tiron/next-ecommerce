import { describe, expect, it } from "vitest";
import { budgetBody, firebaseEnv, firestoreFields, maskEnv, mergeEnv, validProjectId, validSiteUrl } from "./values.mjs";

describe("setup CLI values", () => {
   it("checks project ids and store addresses", () => {
      expect(validProjectId("my-shop-2026")).toBe(true);
      expect(validProjectId("Shop")).toBe(false);
      expect(validProjectId("1shop-store")).toBe(false);
      expect(validProjectId("shop-")).toBe(false);
      expect(validSiteUrl("https://shop.example.com")).toBe(true);
      expect(validSiteUrl("http://localhost:3000")).toBe(true);
      expect(validSiteUrl("http://shop.example.com")).toBe(false);
      expect(validSiteUrl("https://shop.example.com/store")).toBe(false);
   });

   it("maps the web app config to the store's variables", () => {
      const env = firebaseEnv({ apiKey: "k", authDomain: "p.firebaseapp.com", projectId: "p", storageBucket: "p.firebasestorage.app", messagingSenderId: "1", appId: "1:2:web:3" });
      expect(env.NEXT_PUBLIC_PROJECTID).toBe("p");
      expect(env.NEXT_PUBLIC_MEASUREMENTID).toBe("");
   });

   it("updates .env files without losing comments or other variables", () => {
      const existing = "# Firebase\nNEXT_PUBLIC_APIKEY=old\nOTHER=keep\n\n";
      expect(mergeEnv(existing, { NEXT_PUBLIC_APIKEY: "new", NEXT_PUBLIC_SITE_URL: "https://shop.example.com", SKIPPED: undefined })).toBe("# Firebase\nNEXT_PUBLIC_APIKEY=new\nOTHER=keep\nNEXT_PUBLIC_SITE_URL=https://shop.example.com\n");
      expect(mergeEnv("", { A: "1" })).toBe("A=1\n");
   });

   it("hides secret values when printing a plan", () => {
      expect(maskEnv({ EMAIL_PASSWORD: "x", NEXT_PUBLIC_APIKEY: "public", SITE_URL: "https://a.b", ALGOLIA_API_WRITE_KEY: "" })).toEqual({ EMAIL_PASSWORD: "••••", NEXT_PUBLIC_APIKEY: "public", SITE_URL: "https://a.b", ALGOLIA_API_WRITE_KEY: "" });
   });

   it("builds the budget and Firestore request bodies", () => {
      const budget = budgetBody("123", 10.4, "Nordlicht");
      expect(budget.budgetFilter.projects).toEqual(["projects/123"]);
      expect(budget.amount.specifiedAmount.units).toBe("10");
      expect(budget.thresholdRules).toHaveLength(3);
      expect(firestoreFields({ a: "x", b: 2, c: 1.5, d: true, e: null, f: new Date("2026-01-01T00:00:00Z") }).fields).toEqual({
         a: { stringValue: "x" },
         b: { integerValue: "2" },
         c: { doubleValue: 1.5 },
         d: { booleanValue: true },
         e: { nullValue: null },
         f: { timestampValue: "2026-01-01T00:00:00.000Z" },
      });
   });
});
