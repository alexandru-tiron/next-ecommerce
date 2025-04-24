import { getInfoData } from "@/queries";
import { getTranslations } from "next-intl/server";

export default async function HowToBuy() {
   const info = await getInfoData();
   const t = await getTranslations("HowToBuy");
   return (
      <div className=" py-10 px-6 md:px-20 lg:px-64">
         {/* Title */}
         <div className="text-center mb-6">
            <h2 className="text-3xl font-bold">{t("howToBuy")}</h2>
         </div>

         {/* Welcome Message */}
         <div className=" mb-6">
            <p className="text-lg font-semibold">{t("howToBuyWelcomeMessage", { store_name: info.store_name })}</p>
         </div>

         {/* Order Instructions */}
         <div className="text-gray-900 flex flex-col gap-4">
            <h3 className="text-2xl font-semibold ">{t("howToBuyOrderInstructionsTitle")}</h3>
            <p>{t("howToBuyOrderInstructions1")}</p>
            <p>{t("howToBuyOrderInstructions2")}</p>
            <p>{t("howToBuyOrderInstructions3")}</p>
            <p>{t("howToBuyOrderInstructions4")}</p>
            <p>{t("howToBuyOrderInstructions5")}</p>
            <p>{t("howToBuyOrderInstructions6")}</p>

            {/* Validation Section */}
            <h3 className="text-xl font-semibold mt-6">{t("howToBuyOrderInstructionsValidationTitle")}</h3>
            <p>{t("howToBuyOrderInstructions7")}</p>
            <p>{t("howToBuyOrderInstructions8")}</p>

            {/* Thank You Message */}
            <p className="text-lg font-semibold mt-6">{t("howToBuyOrderInstructions9")}</p>
         </div>
      </div>
   );
}
