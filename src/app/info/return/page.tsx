import { getInfoData } from "@/queries";
import { getTranslations } from "next-intl/server";

export default async function Return() {
   const info = await getInfoData();
   const t = await getTranslations("Return");
   return (
      <div className=" py-10 px-6 md:px-20 lg:px-64 ">
         <h2 className="text-3xl font-bold mb-8 text-center">{t("returnTitle")}</h2>

         <div className="text-gray-900 flex flex-col gap-4 mb-4">
            <p className=" font-semibold">{t("returnDescription", { store_name: info.store_name })}</p>
            <p className=" font-semibold">{t("returnDescription2")}</p>
         </div>
         {/* Section: Brands */}
         <div className="mb-10">
            <h3 className="text-2xl font-semibold mb-3">{t("returnDescription3")}</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-900">
               <li>{t("returnDescription4")}</li>
               <li>{t("returnDescription5")}</li>
               <li>{t("returnDescription6")}</li>
               <li>{t("returnDescription7")}</li>
               <li>{t("returnDescription8")}</li>
            </ul>
            <p>{t("returnDescription9")}</p>
         </div>

         {/* Section: Follow Us */}
         <div className="mb-10 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold">{t("returnDescription11")}</h3>
            <p>{t("returnDescription12")}</p>
            <p>
               {t("returnDescription13")} <a href={`mailto:${info.orders_mail}`}>{info.orders_mail}</a> {t("returnDescription14")}
            </p>
            <p>{t("returnDescription15")}</p>
            <p className=" mb-2">{t("returnDescription16")}</p>
            <p>{t("returnDescription17", { store_address: info.store_address, phone_no: info.phone_no, store_name: info.store_name })}</p>
            <p>{t("returnDescription18")}</p>
            <p className=" mb-2">{t("returnDescription19")}</p>
            <p>{t("returnDescription20")}</p>
            <p>{t("returnDescription21")}</p>
            <p>{t("returnDescription22")}</p>
         </div>
      </div>
   );
}
