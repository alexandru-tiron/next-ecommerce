import { getTranslations } from "next-intl/server";

export const WhyChooseUs = async () => {
   const t = await getTranslations("HomePage");
   return(
   <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4 md:px-8 lg:px-16 xl:px-32 2xl:px-64">
         <h2 className="text-3xl font-light text-center mb-12">{t("whyChooseUsTitle")}</h2>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center p-6">
               <div className="w-16 h-16 flex items-center justify-center rounded-full bg-black mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
               </div>
               <h3 className="text-xl font-medium mb-2">{t("whyChooseUsTitle1")}</h3>
               <p className="text-gray-600">{t("whyChooseUsDescription1")}</p>
            </div>

            <div className="flex flex-col items-center text-center p-6">
               <div className="w-16 h-16 flex items-center justify-center rounded-full bg-black mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
               </div>
               <h3 className="text-xl font-medium mb-2">{t("whyChooseUsTitle2")}</h3>
               <p className="text-gray-600">{t("whyChooseUsDescription2")}</p>
            </div>

            <div className="flex flex-col items-center text-center p-6">
               <div className="w-16 h-16 flex items-center justify-center rounded-full bg-black mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
               </div>
               <h3 className="text-xl font-medium mb-2">{t("whyChooseUsTitle3")}</h3>
               <p className="text-gray-600">{t("whyChooseUsDescription3")}</p>
            </div>
         </div>
      </div>
   </section>
)};
