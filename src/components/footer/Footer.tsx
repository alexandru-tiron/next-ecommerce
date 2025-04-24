import Link from "next/link";
import { Phone, Mail, MapPin, Instagram, Facebook, Twitter } from "lucide-react";
import { getCategData, getInfoData } from "@/queries";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";

const Footer = async () => {
   const headersList = await headers();
   const fullUrl = headersList.get("referer") || "";
   const isAdminRoute = fullUrl.includes("admin");
   if (isAdminRoute) return null;

   const info = await getInfoData();
   const categ = await getCategData();
   const t = await getTranslations("Footer");
   return (
      <footer className="w-full bg-gray-100 text-sm mt-auto pb-2">
         <div className="pt-8 px-12 md:px-16lg:px-32 xl:px-64 ">
            <div className="flex flex-col gap-4  md:flex-row justify-between ">
               <div className="flex order-last md:order-first flex-col gap-4">
                  <h1 className="font-medium text-lg text-center md:text-left">{t("company")}</h1>
                  <div className="flex flex-col gap-2">
                     <Link href="/info/about-us">{t("companyDescription1")}</Link>
                     <Link href="/info/contact">{t("companyDescription2")}</Link>
                     <Link href="/info/how-to-buy">{t("companyDescription3")}</Link>
                     <Link href="/info/delivery-and-payment">{t("companyDescription4")}</Link>
                     <Link href="/info/return">{t("companyDescription5")}</Link>
                     <Link href="/info/terms-and-conditions">{t("companyDescription6")}</Link>
                     <Link href="/info/privacy-policy">{t("companyDescription7")}</Link>
                     <Link href="/info/consent-modification-request">{t("companyDescription8")}</Link>
                     <Link href="https://anpc.ro/">{t("companyDescription9")}</Link>
                  </div>
               </div>
               <div className="flex  flex-col gap-4">
                  <h1 className="font-medium text-lg text-center md:text-left">{t("shop")}</h1>
                  <div className="flex flex-col gap-2">
                     {categ.map(
                        (item, i) =>
                           i < 5 && (
                              <Link key={item.id} href={`/list?cat=${item.name}`}>
                                 {item.name[0].toUpperCase() + item.name.slice(1)}
                              </Link>
                           )
                     )}
                  </div>
               </div>
               <div className=" flex order-first md:order-last flex-col gap-4">
                  <Link href="/">
                     <div className="font-medium text-lg text-center md:text-left">{info.store_name}</div>
                  </Link>
                  <div className="info-contc ">
                     <a href={`tel:${info.phone_no}`} className="flex items-center gap-4 mb-4 text-gray-700">
                        <Phone className="size-5" />
                        <span>{info.phone_no}</span>
                     </a>
                     <a href={`mailto:${info.contact_mail}`} className="flex items-center gap-4 mb-4 text-gray-700">
                        <Mail className="size-5" />
                        <span>{info.contact_mail}</span>
                     </a>
                     <a href="https://maps.app.goo.gl/WZKoCNVHFeuJPdXx9" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 text-gray-700">
                        <MapPin className="size-5" />
                        <span>{info.store_address}</span>
                     </a>
                  </div>
                  <div className="flex items-center gap-6 my-4">
                     {info.instagram_link && (
                        <Link href={info.instagram_link} target="_blank" rel="noopener noreferrer">
                           <Instagram className="size-4" />
                        </Link>
                     )}
                     {info.facebook_link && (
                        <Link href={info.facebook_link} target="_blank" rel="noopener noreferrer">
                           <Facebook className="size-4" />
                        </Link>
                     )}
                     {info.x_link && (
                        <Link href={info.x_link} target="_blank" rel="noopener noreferrer">
                           <Twitter className="size-4" />
                        </Link>
                     )}
                  </div>
               </div>
            </div>
         </div>
         <div className="flex justify-center items-center">
            ©{new Date(Date.now()).getFullYear()} {info.store_name}
         </div>
      </footer>
   );
};

export default Footer;
