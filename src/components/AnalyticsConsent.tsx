"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Analytics } from "@core/settings";
import { useStoreSettings } from "./StoreSettingsProvider";

const CONSENT_KEY = "analytics-consent";
type Consent = "granted" | "denied";

function readConsent(): Consent | null {
   try {
      const value = localStorage.getItem(CONSENT_KEY);
      return value === "granted" || value === "denied" ? value : null;
   } catch {
      return null;
   }
}

// Adds the provider's script. It's created from this (nonced) bundle, so the CSP's 'strict-dynamic' allows it.
function loadAnalytics(analytics: Analytics) {
   if (document.querySelector("script[data-store-analytics]")) return;
   const script = document.createElement("script");
   script.async = true;
   script.dataset.storeAnalytics = analytics.provider;
   if (analytics.provider === "ga4") {
      const w = window as typeof window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
      w.dataLayer = w.dataLayer || [];
      w.gtag = function gtag() {
         // gtag.js reads the arguments object itself
         // eslint-disable-next-line prefer-rest-params
         w.dataLayer!.push(arguments);
      };
      w.gtag("js", new Date());
      w.gtag("config", analytics.ga4_id, { anonymize_ip: true });
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(analytics.ga4_id)}`;
   } else {
      script.dataset.domain = analytics.plausible_domain;
      script.src = "https://plausible.io/js/script.js";
   }
   document.head.appendChild(script);
}

// Analytics stay off until the owner picks a provider in Settings, and then load only after the visitor agrees
export default function AnalyticsConsent() {
   const { analytics } = useStoreSettings();
   const t = useTranslations("Consent");
   const [consent, setConsent] = useState<Consent | null | undefined>(undefined);

   useEffect(() => setConsent(readConsent()), []);

   useEffect(() => {
      if (analytics.provider !== "none" && consent === "granted") loadAnalytics(analytics);
   }, [analytics, consent]);

   if (analytics.provider === "none" || consent !== null) return null;

   const choose = (value: Consent) => {
      try {
         localStorage.setItem(CONSENT_KEY, value);
      } catch {
         // The choice then lasts only for this page view
      }
      setConsent(value);
   };

   return (
      <div role="dialog" aria-live="polite" aria-label={t("title")} className="fixed bottom-4 inset-x-4 md:left-auto md:max-w-md z-50 bg-white border border-gray-200 shadow-lg rounded-lg p-4 text-sm">
         <p className="text-gray-700">
            {t("text")}{" "}
            <Link href="/info/privacy-policy" className="underline text-brand-700">
               {t("privacy")}
            </Link>
         </p>
         <div className="flex justify-end gap-2 mt-3">
            <button type="button" onClick={() => choose("denied")} className="px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50">
               {t("decline")}
            </button>
            <button type="button" onClick={() => choose("granted")} className="px-3 py-1.5 rounded-md bg-brand-700 text-white hover:bg-brand-800">
               {t("accept")}
            </button>
         </div>
      </div>
   );
}
