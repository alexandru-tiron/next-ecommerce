import { getInfoData } from "@/queries";
import { getTranslations } from "next-intl/server";

export default async function PrivacyPolicy() {
   const info = await getInfoData();
   const t = await getTranslations("PrivacyPolicy");
   return (
      <div className="py-10 px-6 md:px-20 lg:px-64">
         {/* Title */}
         <div className="text-center mb-6">
            <h2 className="text-3xl font-bold">{t("privacyPolicyTitle")}</h2>
         </div>

         {/* Section 1: General Information */}
         <div className="mb-6">
            <h3 className="text-xl font-semibold">{t("privacyPolicyGeneralInformation")}</h3>
            <p className="text-gray-900 mt-2">
               {t("privacyPolicyGeneralInformationDescription")}
            </p>
         </div>

         {/* Section 2: Data Collection */}
         <div className="mb-6">
            <h3 className="text-xl font-semibold">{t("privacyPolicyDataCollection")}</h3>
            <ul className="list-disc list-inside text-gray-900 mt-2 space-y-2">
               <li>{t("privacyPolicyDataCollectionDescription")}</li>
               <li>{t("privacyPolicyDataCollectionDescription2")}</li>
               <li>{t("privacyPolicyDataCollectionDescription3")}</li>
               <li>{t("privacyPolicyDataCollectionDescription4")}</li>
               <li>{t("privacyPolicyDataCollectionDescription5")}</li>
               <li>{t("privacyPolicyDataCollectionDescription6")}</li>
            </ul>
         </div>

         {/* Section 3: User Rights */}
         <div className="mb-6">
            <h3 className="text-xl font-semibold">{t("privacyPolicyUserRights")}</h3>
            <ul className="list-disc list-inside text-gray-900 mt-2 space-y-2">
               <li>{t("privacyPolicyUserRightsDescription")}</li>
               <li>{t("privacyPolicyUserRightsDescription2")}</li>
               <li>{t("privacyPolicyUserRightsDescription3")}</li>
               <li>{t("privacyPolicyUserRightsDescription4")}</li>
               <li>{t("privacyPolicyUserRightsDescription5")}</li>
            </ul>
         </div>

         {/* Section 4: Data Deletion Request */}
         <div className="mb-6">
            <h3 className="text-xl font-semibold">{t("privacyPolicyDataDeletionRequest")}</h3>
            <p className="text-gray-900 mt-2">
               {t("privacyPolicyDataDeletionRequestDescription")}
            </p>
            <ol className="list-decimal list-inside text-gray-900 mt-2 space-y-2">
               <li>
               {t("privacyPolicyDataDeletionRequestStep1")} <span className="text-blue-400"><a href={`mailto:${info.contact_mail}`}>{info.contact_mail}</a></span>.
               </li>
               <li>{t("privacyPolicyDataDeletionRequestStep2")}</li>
               <li>{t("privacyPolicyDataDeletionRequestStep3")}</li>
               <li>{t("privacyPolicyDataDeletionRequestStep4")}</li>
               <li>{t("privacyPolicyDataDeletionRequestStep5")}</li>
            </ol>
         </div>

         {/* Section 5: Exceptions */}
         <div className="mb-6">
            <h3 className="text-xl font-semibold">{t("privacyPolicyExceptions")}</h3>
            <p className="text-gray-900 mt-2">
               {t("privacyPolicyExceptionsDescription")}
            </p>
         </div>
      </div>
   );
}
