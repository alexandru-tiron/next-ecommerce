"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useTranslations } from "next-intl";
import { Check, RefreshCw } from "lucide-react";
import { can } from "@core/roles";
import { DEFAULT_VAT_RATE, isValidVatRate } from "@core/vat";
import {
   Branding,
   brandingFrom,
   INFO_PAGES,
   Localization,
   localizationFrom,
   ShippingSettings,
   shippingFrom,
   StoreInfo,
   storeInfoFrom,
   systemFrom,
} from "@core/settings";
import app, { auth, db } from "@/lib/firebaseInit";
import { PaymentSettings, paymentSettingsFrom } from "@/lib/payments";
import { refreshStore } from "@/lib/refreshStore";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import syncUser from "@/state/auth/actions/setUser";
import BrandingSettingsForm from "@/components/admin/settings/BrandingSettingsForm";
import LocalizationSettingsForm from "@/components/admin/settings/LocalizationSettingsForm";
import PaymentSettingsForm from "@/components/admin/settings/PaymentSettingsForm";
import { storeErrorOf, useStoreErrorMessage } from "@/components/common/useStoreError";

const STEPS = ["owner", "store", "branding", "localization", "shipping", "payments", "pages", "finish"] as const;
const TOKEN_KEY = "setupToken";
const inputClass = "mt-1 px-3 py-2 block w-full rounded-md border border-gray-300 shadow-sm sm:text-sm";

// The first-run wizard. Opened with the one-time setup link (/setup#token=…) from the setup CLI or `npm run setup-link`:
// the visitor signs in, becomes the owner (claimSetup function), then fills in the main settings. The steps write the
// same Settings documents as Admin → Settings. Finishing sets Settings/System.setup_completed, which locks the wizard for good.
export default function SetupPage() {
   const t = useTranslations("Setup");
   const tAdmin = useTranslations("Admin");
   const tStore = useTranslations("StoreSettings");
   const tPages = useTranslations("InfoPages");
   const errorMessage = useStoreErrorMessage();
   const router = useRouter();
   const dispatch = useAppDispatch();
   const { user, role, isAuthReady } = useAppSelector((state) => state.auth);
   const isOwner = can(role, "manageTeam");

   const [status, setStatus] = useState<"loading" | "open" | "done">("loading");
   const [step, setStep] = useState(0);
   const [token, setToken] = useState("");
   const [busy, setBusy] = useState(false);
   const [error, setError] = useState("");
   const [info, setInfo] = useState<StoreInfo>(storeInfoFrom(null));
   const [branding, setBranding] = useState<Branding>(brandingFrom(null));
   const [localization, setLocalization] = useState<Localization>(localizationFrom(null));
   const [vatRate, setVatRate] = useState(DEFAULT_VAT_RATE);
   const [shipping, setShipping] = useState<ShippingSettings>(shippingFrom(null));
   const [payments, setPayments] = useState<PaymentSettings>(paymentSettingsFrom(undefined));

   // The token arrives after # (never sent to the server); keep it for the round trip through the login page
   useEffect(() => {
      const fromLink = new URLSearchParams(window.location.hash.slice(1)).get("token");
      if (fromLink) {
         sessionStorage.setItem(TOKEN_KEY, fromLink);
         history.replaceState(null, "", window.location.pathname);
      }
      setToken(fromLink ?? sessionStorage.getItem(TOKEN_KEY) ?? "");
   }, []);

   useEffect(() => {
      const read = async (name: string) => (await getDoc(doc(db, "Settings", name))).data();
      Promise.all(["System", "Info", "Branding", "Localization", "Tax", "Shipping", "Payments"].map(read))
         .then(([system, infoData, brandingData, localizationData, tax, shippingData, paymentsData]) => {
            const storeInfo = storeInfoFrom(infoData);
            setInfo(storeInfo);
            setBranding(brandingFrom(brandingData));
            setLocalization(localizationFrom(localizationData));
            if (isValidVatRate(tax?.vat_rate)) setVatRate(tax.vat_rate);
            setShipping(shippingFrom(shippingData));
            setPayments(paymentSettingsFrom(paymentsData));
            setStatus(systemFrom(system, storeInfo).setup_completed ? "done" : "open");
         })
         .catch((loadError) => {
            console.error("Error loading the settings:", loadError);
            setStatus("open");
         });
   }, []);

   // An owner who left halfway continues with the store details
   useEffect(() => {
      if (isOwner && step === 0) setStep(1);
   }, [isOwner, step]);

   const claim = async () => {
      setBusy(true);
      setError("");
      try {
         await httpsCallable<{ token: string }, { role: string }>(getFunctions(app, "europe-west3"), "claimSetup")({ token: token.trim() });
         sessionStorage.removeItem(TOKEN_KEY);
         // The owner role arrives with a fresh ID token
         await auth.currentUser?.getIdToken(true);
         if (auth.currentUser) await dispatch(syncUser(auth.currentUser));
      } catch (claimError) {
         const storeError = storeErrorOf(claimError);
         setError(storeError ? errorMessage(storeError.code, storeError.params) : t("saveFailed"));
      } finally {
         setBusy(false);
      }
   };

   // Saves the current step's settings, then moves on
   const save = async () => {
      setBusy(true);
      setError("");
      try {
         const write = (name: string, data: object) => setDoc(doc(db, "Settings", name), data, { merge: true });
         const current = STEPS[step];
         if (current === "store") await write("Info", storeInfoFrom(info));
         if (current === "branding") await write("Branding", brandingFrom(branding));
         if (current === "localization") {
            if (!isValidVatRate(vatRate)) throw new Error("vat");
            await write("Localization", localizationFrom(localization));
            await write("Tax", { vat_rate: vatRate });
         }
         if (current === "shipping") await write("Shipping", shippingFrom(shipping));
         if (current === "payments") await write("Payments", paymentSettingsFrom(payments));
         if (current === "finish") {
            await write("System", { setup_completed: true, setup_completed_at: serverTimestamp() });
            await refreshStore("settings");
            router.push("/admin");
            return;
         }
         setStep(step + 1);
         window.scrollTo({ top: 0 });
      } catch (saveError) {
         console.error("Error saving the setup step:", saveError);
         setError(t("saveFailed"));
      } finally {
         setBusy(false);
      }
   };

   if (status === "loading" || !isAuthReady) {
      return (
         <div className="flex justify-center py-24">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
         </div>
      );
   }

   if (status === "done") {
      return (
         <Card>
            <h1 className="text-2xl font-semibold text-gray-900">{t("lockedTitle")}</h1>
            <p className="mt-2 text-gray-600">{t("lockedText")}</p>
            <div className="mt-6 flex gap-3">
               {role && (
                  <Link href="/admin" className="px-4 py-2 rounded-md bg-black text-white text-sm font-medium hover:bg-gray-800">
                     {t("openAdmin")}
                  </Link>
               )}
               <Link href="/" className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  {t("goToStore")}
               </Link>
            </div>
         </Card>
      );
   }

   const field = (id: string, label: string, input: ReactNode, hint?: string) => (
      <div>
         <label htmlFor={id} className="block text-sm font-medium text-gray-700">
            {label}
         </label>
         {input}
         {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      </div>
   );
   const infoInput = (key: keyof StoreInfo, type = "text") => <input id={key} type={type} value={info[key]} onChange={(e) => setInfo({ ...info, [key]: key === "country" ? e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2) : e.target.value })} className={inputClass} />;

   const content: Record<(typeof STEPS)[number], ReactNode> = {
      owner: !user ? (
         <div className="space-y-4">
            <p className="text-gray-700">{t("signInFirst")}</p>
            <Link href="/login?redirect=/setup" className="inline-block px-4 py-2 rounded-md bg-black text-white text-sm font-medium hover:bg-gray-800">
               {t("signIn")}
            </Link>
         </div>
      ) : (
         <div className="space-y-4">
            <p className="text-sm text-gray-600">{t("signedInAs", { email: user.email ?? "" })}</p>
            {field("setupToken", t("tokenLabel"), <input id="setupToken" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" spellCheck={false} className={`${inputClass} font-mono`} />, t("tokenHint"))}
            <button type="button" onClick={claim} disabled={busy || token.trim().length < 20} className="inline-flex items-center px-4 py-2 rounded-md bg-black text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
               {busy && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
               {t("claim")}
            </button>
         </div>
      ),
      store: (
         <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {field("store_name", tAdmin("storeName"), infoInput("store_name"))}
            {field("legal_name", tStore("legalName"), infoInput("legal_name"), tStore("legalNameHint"))}
            {field("contact_mail", tAdmin("contactEmail"), infoInput("contact_mail", "email"))}
            {field("orders_mail", tAdmin("ordersEmail"), infoInput("orders_mail", "email"))}
            {field("phone_no", tAdmin("storePhone"), infoInput("phone_no", "tel"))}
            {field("store_address", tAdmin("storeAddress"), infoInput("store_address"))}
            {field("tax_id", tStore("taxId"), infoInput("tax_id"))}
            {field("country", tStore("country"), infoInput("country"), tStore("countryHint"))}
         </div>
      ),
      branding: <BrandingSettingsForm settings={branding} onChange={setBranding} />,
      localization: (
         <div className="space-y-6">
            <LocalizationSettingsForm settings={localization} onChange={setLocalization} />
            <div className="max-w-xs">
               {field("vatRate", tAdmin("vatRate"), <input id="vatRate" type="number" min={0} max={100} step="0.1" value={vatRate} onChange={(e) => setVatRate(parseFloat(e.target.value))} className={inputClass} />, tAdmin("vatRateLabel"))}
            </div>
         </div>
      ),
      shipping: (
         <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {field("defaultPrice", tAdmin("defaultShippingPrice", { currency: localization.currency }), <input id="defaultPrice" type="number" min={0} step="0.01" value={shipping.default_price} onChange={(e) => setShipping({ ...shipping, default_price: parseFloat(e.target.value) })} className={inputClass} />)}
            <label className="flex items-center gap-2 text-sm text-gray-700 sm:pt-6">
               <input type="checkbox" checked={shipping.enable_threshold} onChange={(e) => setShipping({ ...shipping, enable_threshold: e.target.checked })} className="h-4 w-4 rounded border-gray-300" />
               {tAdmin("enableThreshold")}
            </label>
            {shipping.enable_threshold &&
               field("threshold", tAdmin("freeShippingThreshold"), <input id="threshold" type="number" min={0} step="0.01" value={shipping.free_shipping_threshold} onChange={(e) => setShipping({ ...shipping, free_shipping_threshold: parseFloat(e.target.value) })} className={inputClass} />, tAdmin("freeShippingThresholdLabel"))}
         </div>
      ),
      payments: <PaymentSettingsForm settings={payments} onChange={setPayments} />,
      pages: (
         <div className="space-y-4">
            <p className="text-gray-700">{t("pagesText")}</p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
               {INFO_PAGES.map((page) => (
                  <li key={page}>
                     <a href={`/info/${page}`} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline">
                        {tPages(page)}
                     </a>
                  </li>
               ))}
            </ul>
         </div>
      ),
      finish: <p className="text-gray-700">{t("finishText")}</p>,
   };

   return (
      <Card wide>
         <h1 className="text-2xl font-semibold text-gray-900">{t("title")}</h1>
         <p className="mt-1 text-sm text-gray-500">{t("intro")}</p>

         <ol className="mt-6 flex flex-wrap gap-2 text-xs">
            {STEPS.map((item, index) => (
               <li key={item} className={`flex items-center gap-1 rounded-full px-3 py-1 ${index === step ? "bg-black text-white" : index < step ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
                  {index < step && <Check className="h-3 w-3" />}
                  {index + 1}. {t(`steps.${item}`)}
               </li>
            ))}
         </ol>

         <h2 className="mt-8 mb-4 text-lg font-medium text-gray-900">{t(`steps.${STEPS[step]}`)}</h2>
         {content[STEPS[step]]}

         {error && <p className="mt-6 p-3 rounded-md bg-red-50 text-sm text-red-800">{error}</p>}

         {step > 0 && (
            <div className="mt-8 flex justify-between border-t border-gray-200 pt-6">
               <button type="button" onClick={() => setStep(step - 1)} disabled={busy || step === 1} className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40">
                  {t("back")}
               </button>
               <button type="button" onClick={save} disabled={busy || !isOwner} className="inline-flex items-center px-4 py-2 rounded-md bg-black text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                  {busy && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  {STEPS[step] === "finish" ? t("finish") : t("next")}
               </button>
            </div>
         )}
      </Card>
   );
}

function Card({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
   return <div className={`mx-auto rounded-lg border border-gray-200 bg-white p-6 sm:p-8 ${wide ? "max-w-4xl" : "max-w-lg"}`}>{children}</div>;
}
