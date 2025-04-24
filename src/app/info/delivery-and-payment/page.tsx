import { getInfoData, getShippData } from "@/queries";
import { getTranslations } from "next-intl/server";

export default async function DeliveryAndPayment() {
   const info = await getInfoData();
   const shipping = await getShippData();
   const t = await getTranslations("DeliveryAndPayment");
   return (
      <div className=" py-10 px-6 md:px-20 lg:px-64">
         {/* Title */}
         <div className="text-center mb-6">
            <h2 className="text-3xl font-bold">{t("deliveryAndPaymentTitle")}</h2>
         </div>

         <div className="text-gray-900 flex flex-col gap-4">
            <p>{t("deliveryAndPaymentDescription")}</p>
            <p>{t("deliveryAndPaymentDescription2")}</p>
            <p>{t("deliveryAndPaymentDescription3")}</p>
            <p>{t("deliveryAndPaymentDescription4")}</p>
            <p className=" font-semibold">{t("deliveryAndPaymentDescription5")}</p>
            <p className=" font-semibold">
               {t("deliveryAndPaymentDescription6")} <a href={`mailto:${info.orders_mail}`}>{info.orders_mail}</a>
               {t("orPhone")} <a href={`tel:${info.phone_no}`}>{info.phone_no}</a>
            </p>
            <p className=" font-semibold">{t("deliveryAndPaymentDescription7", { shipping_threshold: shipping.free_shipping_threshold, shipping_price: shipping.default_price })}</p>
            <p className=" font-semibold">{t("deliveryAndPaymentDescription8")}</p>
            <p className=" font-semibold">{t("deliveryAndPaymentDescription9")}</p>
            <p>{t("deliveryAndPaymentDescription10")}</p>
         </div>
      </div>
   );
}
