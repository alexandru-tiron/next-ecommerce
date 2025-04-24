import { getInfoData, getShippData } from "@/queries";
import { getTranslations } from "next-intl/server";

export default async function TermsAndConditions() {
   const info = await getInfoData();
   const shipping = await getShippData();
   const t = await getTranslations("TermsAndConditions");
   return (
      <div className="py-10 px-6 md:px-20 lg:px-64">
         {/* Title */}
         <div className="text-center mb-8">
            <h2 className="text-3xl font-bold">{t("termsAndConditionsTitle")}</h2>
         </div>

         <div className="space-y-6 text-justify">
            {/* Section 1 */}
            <section>
               <h3 className="text-xl font-semibold">1. {t("termsAndConditionsSection1")}</h3>
               <p>
                  {t("termsAndConditionsDescription1", { store_name: info.store_name })}
                  {t("termsAndConditionsDescription2", { store_address: info.store_address })}
                  <br />
                  <strong>{t("termsAndConditionsDescription3")}</strong> JXX/XXXX/XXX, CUI RO 12345678.
                  <br />
                  {t("termsAndConditionsDescription4")}
               </p>
            </section>

            {/* Section 2 */}
            <section>
               <h3 className="text-xl font-semibold">2. {t("termsAndConditionsSection2")}</h3>
               <p>{t("termsAndConditionsDescription5", { store_name: info.store_name })}</p>
               <p>{t("termsAndConditionsDescription6")}</p>
            </section>

            {/* Section 3 */}
            <section>
               <h3 className="text-xl font-semibold">3. {t("termsAndConditionsSection3")}</h3>
               <p>{t("termsAndConditionsDescription7", { store_name: info.store_name })}</p>
               <p>{t("termsAndConditionsDescription8", { store_name: info.store_name })}</p>
            </section>

            {/* Section 4 */}
            <section>
               <h3 className="text-xl font-semibold">4. {t("termsAndConditionsSection4")}</h3>
               <p>{t("termsAndConditionsDescription9", { store_name: info.store_name })}</p>
               <p>{t("termsAndConditionsDescription10")}</p>
            </section>

            {/* Section 5 */}
            <section>
               <h3 className="text-xl font-semibold">5. {t("termsAndConditionsSection5")}</h3>
               <p>
                  {t("termsAndConditionsDescription11")} <br />
                  {t("termsAndConditionsDescription12", { store_name: info.store_name })}
               </p>
            </section>

            {/* Section 6 */}
            <section>
               <h3 className="text-xl font-semibold">6. {t("termsAndConditionsSection6")}</h3>
               <p>{t("termsAndConditionsDescription13", { store_name: info.store_name })}</p>
            </section>

            {/* Section 7 */}
            <section>
               <h3 className="text-xl font-semibold">7. {t("termsAndConditionsSection7")}</h3>
               <p>{t("termsAndConditionsDescription15")}</p>
            </section>

            {/* Section 8 */}
            <section>
               <h3 className="text-xl font-semibold">8. {t("termsAndConditionsSection8")}</h3>
               <p>{t("termsAndConditionsDescription17")}</p>
            </section>

            {/* Section 9 */}
            <section>
               <h3 className="text-xl font-semibold">9. {t("termsAndConditionsSection9")}</h3>
               <p>{t("termsAndConditionsDescription18")}</p>
               <p>{t("termsAndConditionsDescription19")}</p>
            </section>

            {/* Section 10 */}
            <section>
               <h3 className="text-xl font-semibold">10. {t("termsAndConditionsSection10")}</h3>
               <p>{t("termsAndConditionsDescription20")}.</p>
            </section>

            {/* Payment & Delivery */}
            <section>
               <h3 className="text-xl font-semibold">{t("termsAndConditionsSection11")}</h3>
            </section>

            <section>
               <h3 className="text-xl font-semibold">
                  {t("termsAndConditionsSection12")} ({shipping.default_price} RON)
               </h3>
               <p>{t("termsAndConditionsSection13", { free_shipping_threshold: shipping.free_shipping_threshold })}</p>
            </section>
         </div>
      </div>
   );
}
