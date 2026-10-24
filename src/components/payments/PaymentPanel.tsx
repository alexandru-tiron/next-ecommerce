"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CreditCard, Loader2 } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { canPayOrder, orderPaymentMethod, PaymentMethod, PaymentStatus, startCardPayment } from "@/lib/payments";

const statusClasses: Record<PaymentStatus, string> = {
   on_delivery: "bg-gray-100 text-gray-700",
   pending: "bg-yellow-100 text-yellow-800",
   paid: "bg-green-100 text-green-800",
   failed: "bg-red-100 text-red-800",
   expired: "bg-gray-100 text-gray-600",
   refunded: "bg-blue-100 text-blue-800",
};

// Payment method and status of an order, with "Pay now" while a card payment is still possible
const PaymentPanel = ({ orderId, order, notice }: { orderId: string; order: { payment_method?: PaymentMethod; payment_status?: PaymentStatus; status?: string }; notice?: string | null }) => {
   const t = useTranslations("Payment");
   const [starting, setStarting] = useState(false);
   const [error, setError] = useState(false);
   const method = orderPaymentMethod(order);
   const status: PaymentStatus = order.payment_status ?? (method === "cod" ? "on_delivery" : "pending");

   const payNow = async () => {
      if (method === "cod") return;
      setStarting(true);
      setError(false);
      try {
         window.location.assign(await startCardPayment(orderId, method));
      } catch (err) {
         console.error("Payment start error:", err);
         setError(true);
         setStarting(false);
      }
   };

   return (
      <div className="space-y-3">
         {notice === "cancelled" && <p className="rounded-md bg-yellow-50 text-yellow-800 text-sm p-3">{t("cancelledNotice")}</p>}
         {(notice === "failed" || error) && <p className="rounded-md bg-red-50 text-red-800 text-sm p-3">{t("startFailed")}</p>}
         <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
               <CreditCard className="w-4 h-4 text-gray-500" />
               <span className="text-gray-600">{t(`method_${method}`)}</span>
               <span className={twMerge("px-2 py-0.5 rounded-full text-xs font-medium", statusClasses[status])}>{t(`status_${status}`)}</span>
            </div>
            {canPayOrder(order) && (
               <button onClick={payNow} disabled={starting} className="inline-flex items-center rounded-md bg-pink-600 text-white text-sm px-4 py-2 hover:bg-pink-700 disabled:opacity-50">
                  {starting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t("payNow")}
               </button>
            )}
         </div>
      </div>
   );
};

export default PaymentPanel;
