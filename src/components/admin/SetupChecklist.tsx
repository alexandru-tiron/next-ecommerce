"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { collection, doc, getCountFromServer, getDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, ChevronDown, HelpCircle } from "lucide-react";
import { brandingFrom, DEFAULT_STORE_INFO, storeInfoFrom } from "@core/settings";
import { CheckStatus, SecurityCheck, SecurityCheckId } from "@core/setupChecks";
import app, { db } from "@/lib/firebaseInit";
import { paymentSettingsFrom } from "@/lib/payments";

type StepId = "details" | "logo" | "products" | "pages" | "payments" | "domain" | "testOrder";
type Item = { id: string; status: CheckStatus; label: string; hint: string; action?: { href: string; external?: boolean } };

const project = process.env.NEXT_PUBLIC_PROJECTID ?? "";
const firebaseConsole = (path: string) => `https://console.firebase.google.com/project/${project}/${path}`;
const cloudConsole = (path: string) => `https://console.cloud.google.com/${path}?project=${project}`;

// Where to fix each security setting
const SECURITY_LINKS: Record<SecurityCheckId, string | null> = {
   appCheckFunctions: null,
   appCheckFirestore: firebaseConsole("appcheck/products"),
   rules: null,
   adminMfa: firebaseConsole("authentication/settings"),
   backups: cloudConsole("firestore/databases/-default-/disaster-recovery"),
   budget: cloudConsole("billing/budgets"),
};

// Admin dashboard: the setup steps still to do and the live security settings (getSetupStatus function).
// Open while anything needs attention; folded once everything is done.
export default function SetupChecklist() {
   const t = useTranslations("Checklist");
   const [steps, setSteps] = useState<Record<StepId, CheckStatus> | null>(null);
   const [security, setSecurity] = useState<SecurityCheck[] | null>(null);

   useEffect(() => {
      const read = async (name: string) => (await getDoc(doc(db, "Settings", name))).data();
      const count = async (...path: [string, ...string[]]) => (await getCountFromServer(collection(db, ...path))).data().count;
      const status = (done: boolean): CheckStatus => (done ? "ok" : "warn");
      Promise.all([read("Info"), read("Branding"), read("Payments"), count("Products"), count("Settings", "Legal", "Pages"), count("Orders")])
         .then(([infoData, brandingData, paymentsData, products, pages, orders]) => {
            const info = storeInfoFrom(infoData);
            const payments = paymentSettingsFrom(paymentsData);
            const host = window.location.hostname;
            setSteps({
               details: status(info.store_name !== DEFAULT_STORE_INFO.store_name && Boolean(info.contact_mail || info.support_mail) && Boolean(info.store_address)),
               logo: status(Boolean(brandingFrom(brandingData).logo_url)),
               products: status(products > 0),
               pages: status(pages > 0),
               payments: status(payments.stripe_enabled || payments.netopia_enabled),
               domain: status(host !== "localhost" && host !== "127.0.0.1" && !host.endsWith(".vercel.app")),
               testOrder: status(orders > 0),
            });
         })
         .catch((error) => console.error("Error loading the setup checklist:", error));
      httpsCallable<void, { checks: SecurityCheck[] }>(getFunctions(app, "europe-west3"), "getSetupStatus")()
         .then(({ data }) => setSecurity(data.checks))
         .catch((error) => {
            console.error("Error loading the security checks:", error);
            setSecurity([]);
         });
   }, []);

   if (!steps || !security) return null;

   const stepActions: Record<StepId, Item["action"]> = {
      details: { href: "/admin/settings?tab=general" },
      logo: { href: "/admin/settings?tab=branding" },
      products: { href: "/admin/products/add" },
      pages: { href: "/admin/settings?tab=pages" },
      payments: { href: "/admin/settings?tab=payments" },
      domain: undefined,
      testOrder: { href: "/" },
   };
   const setupItems: Item[] = (Object.keys(steps) as StepId[]).map((id) => ({ id, status: steps[id], label: t(`steps.${id}`), hint: t(`stepHints.${id}`), action: stepActions[id] }));
   const securityItems: Item[] = security.map((check) => {
      const href = SECURITY_LINKS[check.id];
      return { id: check.id, status: check.status, label: t(`security.${check.id}`), hint: check.status === "unknown" ? t("unknownHint") : t(`securityHints.${check.id}`, { count: check.count ?? 0 }), action: href ? { href, external: true } : undefined };
   });
   const all = [...setupItems, ...securityItems];
   const done = all.filter((item) => item.status === "ok").length;

   return (
      <details open={done < all.length} className="group rounded-lg border border-gray-200 bg-white">
         <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
            <div>
               <h2 className="font-medium text-gray-900">{t("title")}</h2>
               <p className="text-sm text-gray-500">{t("progress", { done, total: all.length })}</p>
            </div>
            <ChevronDown className="h-5 w-5 text-gray-400 transition-transform group-open:rotate-180" />
         </summary>
         <div className="grid grid-cols-1 gap-6 border-t border-gray-100 p-4 lg:grid-cols-2">
            <Section title={t("setupTitle")}>{setupItems.map((item) => <Row key={item.id} item={item} actionLabel={t("open")} />)}</Section>
            <Section title={t("securityTitle")}>{securityItems.map((item) => <Row key={item.id} item={item} actionLabel={t("open")} />)}</Section>
         </div>
      </details>
   );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
   return (
      <div>
         <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-gray-500">{title}</h3>
         <ul className="space-y-3">{children}</ul>
      </div>
   );
}

function Row({ item, actionLabel }: { item: Item; actionLabel: string }) {
   const icon = item.status === "ok" ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : item.status === "warn" ? <AlertCircle className="h-5 w-5 text-amber-500" /> : <HelpCircle className="h-5 w-5 text-gray-400" />;
   return (
      <li className="flex gap-3">
         <span className="mt-0.5 flex-shrink-0">{icon}</span>
         <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium ${item.status === "ok" ? "text-gray-500" : "text-gray-900"}`}>{item.label}</p>
            {item.status !== "ok" && <p className="text-sm text-gray-500">{item.hint}</p>}
         </div>
         {item.status !== "ok" && item.action && (
            <Link href={item.action.href} {...(item.action.external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="flex-shrink-0 text-sm text-brand-700 underline">
               {actionLabel}
            </Link>
         )}
      </li>
   );
}
