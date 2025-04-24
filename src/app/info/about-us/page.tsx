import { Instagram, Facebook, Twitter } from "lucide-react";
import { getInfoData, getShippData } from "@/queries";
import { getTranslations } from "next-intl/server";

export default async function AboutUs() {
   const info = await getInfoData();
   const shipping = await getShippData();
   const t = await getTranslations("AboutUs");
   return (
      <div className=" py-10 px-6 md:px-20 lg:px-64 ">
         {/* Section: About */}
         <div className=" mb-10">
            <h2 className="text-3xl font-bold mb-8 text-center">{t("aboutUs")}</h2>
            <p className=" mx-auto text-gray-900">{t("aboutUsDescription")}</p>
         </div>

         {/* Section: Brands */}
         <div className="mb-10">
            <h3 className="text-2xl font-semibold mb-3">{t("aboutUsBrands", { store_name: info.store_name })}</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-900">
               <li>
                  <strong>{t("aboutUsBrandsList")}</strong>
               </li>
               <li>
                  <strong>{t("aboutUsBrandsList2")}</strong>
               </li>
               <li>
                  <strong>{t("aboutUsBrandsList3")}</strong>
               </li>
            </ul>
         </div>

         {/* Section: Community */}
         <div className="mb-10">
            <h3 className="text-2xl font-semibold mb-3">{t("aboutUsCommunity")}</h3>
            <p className="text-gray-900">{t("aboutUsCommunityDescription")}</p>
         </div>

         {/* Section: Follow Us */}
         <div className="mb-10">
            <h3 className="text-2xl font-semibold mb-3">{t("aboutUsSocialMedia")}</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-900">
               <li>{t("aboutUsSocialMediaList")}</li>
               <li>{t("aboutUsSocialMediaList2")}</li>
               <li>{t("aboutUsSocialMediaList3")}</li>
               <li>{t("aboutUsSocialMediaList4")}</li>
               <li>{t("aboutUsSocialMediaList5")}</li>
            </ul>
         </div>

         {/* Section: Social Media */}
         <div className="flex  space-x-6 mb-10">
            {info.instagram_link && (
               <a href={info.instagram_link} target="_blank" rel="noopener noreferrer">
                  <Instagram className=" size-14" />
               </a>
            )}
            {info.facebook_link && (
               <a href={info.facebook_link} target="_blank" rel="noopener noreferrer">
                  <Facebook className=" size-14" />
               </a>
            )}
            {info.x_link && (
               <a href={info.x_link} target="_blank" rel="noopener noreferrer">
                  <Twitter className=" size-14" />
               </a>
            )}
         </div>

         {/* Section: Why Order? */}
         <div>
            <h3 className="text-2xl font-semibold mb-3">{t("aboutUsWhyOrder", { store_name: info.store_name })}</h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-900">
               <li>{t("aboutUsWhyOrderList")}</li>
               <li>{t("aboutUsWhyOrderList2")}</li>
               <li>{t("aboutUsWhyOrderList3")}</li>
               <li>{t("aboutUsWhyOrderList4", { default_price: shipping.default_price, free_shipping_threshold: shipping.free_shipping_threshold })}</li>
               <li>{t("aboutUsWhyOrderList5")}</li>
               <li>{t("aboutUsWhyOrderList6")}</li>
               <li>{t("aboutUsWhyOrderList7")}</li>
            </ul>
         </div>
      </div>
   );
}
