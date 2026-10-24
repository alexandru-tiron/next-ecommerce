"use client";

import { useTranslations } from "next-intl";
import { PaymentSettings } from "@/lib/payments";

const FUNCTIONS_BASE = `https://europe-west3-${process.env.NEXT_PUBLIC_PROJECTID}.cloudfunctions.net`;

// Payments tab of Admin → Settings. Saved with the other settings into Settings/Payments.
const PaymentSettingsForm = ({ settings, onChange }: { settings: PaymentSettings; onChange: (settings: PaymentSettings) => void }) => {
   const t = useTranslations("Admin");
   const toggle = (key: "cod_enabled" | "stripe_enabled" | "netopia_enabled", label: string, description: string) => (
      <label className="flex items-start gap-3">
         <input type="checkbox" checked={settings[key]} onChange={(e) => onChange({ ...settings, [key]: e.target.checked })} className="mt-1 h-4 w-4 border-gray-300 rounded" />
         <span>
            <span className="block text-sm font-medium text-gray-700">{label}</span>
            <span className="block text-xs text-gray-500">{description}</span>
         </span>
      </label>
   );
   const code = (text: string) => <code className="px-1 py-0.5 rounded bg-gray-100 text-xs break-all">{text}</code>;

   return (
      <div className="space-y-8">
         <div className="space-y-4">
            {toggle("cod_enabled", t("paymentCod"), t("paymentCodHint"))}
            {toggle("stripe_enabled", t("paymentStripe"), t("paymentStripeHint"))}
            {toggle("netopia_enabled", t("paymentNetopia"), t("paymentNetopiaHint"))}
         </div>

         <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
               <label htmlFor="netopiaPos" className="block text-sm font-medium text-gray-700">
                  {t("netopiaPosSignature")}
               </label>
               <input
                  id="netopiaPos"
                  value={settings.netopia_pos_signature}
                  onChange={(e) => onChange({ ...settings, netopia_pos_signature: e.target.value })}
                  placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
                  className="mt-1 px-3 py-2 block w-full rounded-md border border-gray-300 shadow-sm sm:text-sm font-mono"
               />
               <p className="mt-1 text-xs text-gray-500">{t("netopiaPosSignatureHint")}</p>
            </div>
            <label className="flex items-start gap-3 sm:pt-6">
               <input type="checkbox" checked={settings.netopia_live} onChange={(e) => onChange({ ...settings, netopia_live: e.target.checked })} className="mt-1 h-4 w-4 border-gray-300 rounded" />
               <span>
                  <span className="block text-sm font-medium text-gray-700">{t("netopiaLive")}</span>
                  <span className="block text-xs text-gray-500">{t("netopiaLiveHint")}</span>
               </span>
            </label>
         </div>

         <div className="rounded-md bg-gray-50 border border-gray-100 p-4 text-sm text-gray-700 space-y-3">
            <p className="font-medium">{t("paymentSetupTitle")}</p>
            <div>
               <p className="font-medium text-gray-800">Stripe</p>
               <ul className="list-disc ml-5 space-y-1">
                  <li>
                     {t("paymentSetupSecrets")} {code("STRIPE_SECRET_KEY")}, {code("STRIPE_WEBHOOK_SECRET")}
                  </li>
                  <li>
                     {t("stripeWebhookUrl")} {code(`${FUNCTIONS_BASE}/stripeWebhook`)}
                  </li>
                  <li>
                     {t("stripeWebhookEvents")} {code("checkout.session.completed")}, {code("checkout.session.async_payment_succeeded")}, {code("checkout.session.async_payment_failed")}, {code("checkout.session.expired")}, {code("charge.refunded")}
                  </li>
               </ul>
            </div>
            <div>
               <p className="font-medium text-gray-800">NETOPIA Payments</p>
               <ul className="list-disc ml-5 space-y-1">
                  <li>
                     {t("paymentSetupSecrets")} {code("NETOPIA_API_KEY")}, {code("NETOPIA_PUBLIC_KEY")}
                  </li>
                  <li>
                     {t("netopiaIpnUrl")} {code(`${FUNCTIONS_BASE}/netopiaIpn`)}
                  </li>
               </ul>
            </div>
            <p>
               {t("paymentSetupEnable")} {code("ENABLE_STRIPE=true")} / {code("ENABLE_NETOPIA=true")}
            </p>
            <p className="text-xs text-gray-500">{t("paymentSetupNote")}</p>
         </div>
      </div>
   );
};

export default PaymentSettingsForm;
