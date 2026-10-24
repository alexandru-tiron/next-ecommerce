"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckCircle, Clock, XCircle } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseInit";
import { PaymentStatus } from "@/lib/payments";

// Live payment result after returning from Stripe or NETOPIA. The provider's webhook usually arrives a few seconds after the redirect.
const PaymentResult = ({ orderId }: { orderId: string }) => {
   const t = useTranslations("Payment");
   const [status, setStatus] = useState<PaymentStatus | null>(null);

   useEffect(() => {
      let unsubscribeOrder: (() => void) | undefined;
      const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
         unsubscribeOrder?.();
         if (!user) return;
         unsubscribeOrder = onSnapshot(
            doc(db, "Orders", orderId),
            (snap) => setStatus((snap.data()?.payment_status as PaymentStatus) ?? null),
            (error) => console.error("Error listening to the order:", error)
         );
      });
      return () => {
         unsubscribeAuth();
         unsubscribeOrder?.();
      };
   }, [orderId]);

   if (status === "paid") {
      return (
         <p className="flex items-center justify-center gap-2 rounded-md bg-green-50 text-green-800 p-3 mb-6">
            <CheckCircle className="w-5 h-5" />
            {t("confirmed")}
         </p>
      );
   }
   if (status === "failed" || status === "expired") {
      return (
         <div className="rounded-md bg-red-50 text-red-800 p-3 mb-6 text-center space-y-2">
            <p className="flex items-center justify-center gap-2">
               <XCircle className="w-5 h-5" />
               {t("notCompleted")}
            </p>
            <Link href={`/profile/orders/${orderId}`} className="underline text-sm">
               {t("tryAgainFromOrder")}
            </Link>
         </div>
      );
   }
   return (
      <p className="flex items-center justify-center gap-2 rounded-md bg-yellow-50 text-yellow-800 p-3 mb-6">
         <Clock className="w-5 h-5" />
         {t("waiting")}
      </p>
   );
};

export default PaymentResult;
