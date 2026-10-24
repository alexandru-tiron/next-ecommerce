"use client";

import { Check, PackageCheck, Truck, ClipboardCheck, ShoppingBag, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { twMerge } from "tailwind-merge";
import { completedStep, ORDER_STEPS } from "./orderStatus";

const STEP_ICONS = [ShoppingBag, ClipboardCheck, Truck, PackageCheck];

const OrderStatusTimeline = ({ status, trackingNumber }: { status?: string; trackingNumber?: string }) => {
   const t = useTranslations("Orders");

   if (status === "rejected") {
      return (
         <div className="flex items-center gap-3 rounded-lg bg-red-50 text-red-700 p-4">
            <XCircle className="w-6 h-6 shrink-0" />
            <span className="font-medium">{t("orderCancelled")}</span>
         </div>
      );
   }

   const current = completedStep(status);
   return (
      <div className="flex flex-col gap-3">
         <ol className="flex items-start">
            {ORDER_STEPS.map((step, index) => {
               const done = index <= current;
               const Icon = done && index < current ? Check : STEP_ICONS[index];
               return (
                  <li key={step.status} className="flex-1 flex flex-col items-center text-center relative">
                     {index > 0 && <div className={twMerge("absolute top-5 right-1/2 w-full h-0.5 -z-0", index <= current ? "bg-pink-600" : "bg-gray-200")} />}
                     <div className={twMerge("relative z-10 w-10 h-10 rounded-full flex items-center justify-center", done ? "bg-pink-600 text-white" : "bg-gray-100 text-gray-400")}>
                        <Icon className="w-5 h-5" />
                     </div>
                     <span className={twMerge("mt-2 text-xs sm:text-sm", index === current ? "font-semibold text-gray-900" : done ? "text-gray-700" : "text-gray-400")}>{t(step.label)}</span>
                  </li>
               );
            })}
         </ol>
         {trackingNumber && status === "shipped" && (
            <p className="text-sm text-gray-600 text-center">
               {t("trackingNumber")}: <span className="font-medium text-gray-900">{trackingNumber}</span>
            </p>
         )}
      </div>
   );
};

export default OrderStatusTimeline;
