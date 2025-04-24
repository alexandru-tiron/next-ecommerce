import Link from "next/link";
import { CheckCircle, Truck, ShoppingBag } from "lucide-react";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

// Create a client component that uses useSearchParams
const SuccessContent = async ({ id }: { id: string }) => {
   const t = await getTranslations("Checkout");
   return (
      <div className="pt-10 px-4 md:px-20 lg:px-16 xl:px-32 2xl:px-64 pb-16">
         <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-sm border border-gray-100">
            <div className="flex flex-col items-center text-center mb-8">
               <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
               </div>
               <h1 className="text-2xl font-semibold mb-2">{t("orderSuccess")}</h1>
               <p className="text-gray-600">{t("orderSuccessDescription")}</p>
            </div>

            <div className="border-t border-b border-gray-100 py-6 mb-6">
               <div className="flex justify-between mb-4">
                  <span className="font-medium">{t("orderNumber")}:</span>
                  <span className="text-gray-700">{id || "Placeholder"}</span>
               </div>

               <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-medium mb-2 flex items-center">
                     <Truck className="w-4 h-4 mr-2 text-gray-500" />
                     {t("nextSteps")}
                  </h3>
                  <ol className="list-decimal list-inside text-gray-600 text-sm space-y-2 ml-4">
                     <li>{t("orderProcessing")}</li>
                     <li>{t("orderConfirmation")}</li>
                     <li>{t("orderContact")}</li>
                     <li>{t("orderShipping")}</li>
                     <li>{t("orderTracking")}</li>
                  </ol>
               </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
               <Link href="/profile?tab=orders" className="flex-1 py-3 px-4 border border-pink-600 text-pink-600 rounded-md font-medium text-center hover:bg-pink-50 transition-colors">
                  <span className="flex items-center justify-center">
                     <ShoppingBag className="w-4 h-4 mr-2" />
                     {t("viewOrders")}
                  </span>
               </Link>

               <Link href="/list" className="flex-1 py-3 px-4 bg-pink-600 text-white rounded-md font-medium text-center hover:bg-pink-700 transition-colors">
                  <span className="flex items-center justify-center">{t("continueShopping")}</span>
               </Link>
            </div>
         </div>
      </div>
   );
};

// Main component with Suspense boundary
const SuccessPage = async ({ searchParams }: { searchParams: { order: string } }) => {
   const { order } = await searchParams;
   if (!order) {
      notFound();
   }
   return (
      <Suspense
         fallback={
            <div className="pt-10 px-4 md:px-20 lg:px-16 xl:px-32 2xl:px-64 pb-16">
               <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-sm border border-gray-100 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-600"></div>
               </div>
            </div>
         }
      >
         <SuccessContent id={order} />
      </Suspense>
   );
};

export default SuccessPage;
