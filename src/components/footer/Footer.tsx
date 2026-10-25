import Link from "next/link";
import { Phone, Mail, MapPin, Instagram, Facebook, Twitter } from "lucide-react";
import { INFO_PAGES, linkLabel, Locale } from "@core/settings";
import { getCategData, getInfoData, getLocalization, getNavigation } from "@/lib/server/storeData";
import { getLocale, getTranslations } from "next-intl/server";
import { headers } from "next/headers";

const Footer = async () => {
   // Admin and setup pages have no store footer (x-pathname is set in src/middleware.ts)
   const pathname = (await headers()).get("x-pathname") ?? "";
   if (pathname.startsWith("/admin") || pathname.startsWith("/setup")) return null;

   const [info, categ, navigation, localization, locale, t, tPages] = await Promise.all([getInfoData(), getCategData(), getNavigation(), getLocalization(), getLocale(), getTranslations("Footer"), getTranslations("InfoPages")]);
   const external = (url: string) => /^https:\/\//.test(url);
   return (
      <footer className="w-full bg-gray-100 text-sm mt-auto pb-2">
         <div className="pt-8 px-12 md:px-16 lg:px-32 xl:px-64">
            <div className="flex flex-col gap-4 md:flex-row justify-between">
               <div className="flex order-last md:order-first flex-col gap-4">
                  <h2 className="font-medium text-lg text-center md:text-left">{t("company")}</h2>
                  <div className="flex flex-col gap-2">
                     <Link href="/info/about-us">{tPages("about-us")}</Link>
                     <Link href="/info/contact">{t("contact")}</Link>
                     {INFO_PAGES.filter((page) => page !== "about-us").map((page) => (
                        <Link key={page} href={`/info/${page}`}>
                           {tPages(page)}
                        </Link>
                     ))}
                     <Link href="/info/consent-modification-request">{t("consentRequest")}</Link>
                     {/* Romanian online shops have to link to the consumer protection authority */}
                     {info.country === "RO" && (
                        <a href="https://anpc.ro/" target="_blank" rel="noopener noreferrer">
                           {t("consumerAuthority")}
                        </a>
                     )}
                     {navigation.footer_links.map((link) =>
                        external(link.url) ? (
                           <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">
                              {linkLabel(link, locale as Locale, localization.default_locale)}
                           </a>
                        ) : (
                           <Link key={link.url} href={link.url}>
                              {linkLabel(link, locale as Locale, localization.default_locale)}
                           </Link>
                        )
                     )}
                  </div>
               </div>
               <div className="flex flex-col gap-4">
                  <h2 className="font-medium text-lg text-center md:text-left">{t("shop")}</h2>
                  <div className="flex flex-col gap-2">
                     {categ.slice(0, 5).map((item) => (
                        <Link key={item.id} href={`/list?cat=${item.name}`}>
                           {item.name[0].toUpperCase() + item.name.slice(1)}
                        </Link>
                     ))}
                  </div>
               </div>
               <div className="flex order-first md:order-last flex-col gap-4">
                  <Link href="/">
                     <div className="font-medium text-lg text-center md:text-left">{info.store_name}</div>
                  </Link>
                  <div>
                     {info.phone_no && (
                        <a href={`tel:${info.phone_no}`} className="flex items-center gap-4 mb-4 text-gray-700">
                           <Phone className="size-5" />
                           <span>{info.phone_no}</span>
                        </a>
                     )}
                     {info.contact_mail && (
                        <a href={`mailto:${info.contact_mail}`} className="flex items-center gap-4 mb-4 text-gray-700">
                           <Mail className="size-5" />
                           <span>{info.contact_mail}</span>
                        </a>
                     )}
                     {info.store_address && (
                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(info.store_address)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 text-gray-700">
                           <MapPin className="size-5" />
                           <span>{info.store_address}</span>
                        </a>
                     )}
                  </div>
                  <div className="flex items-center gap-6 my-4">
                     {info.instagram_link && (
                        <Link href={info.instagram_link} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                           <Instagram className="size-4" />
                        </Link>
                     )}
                     {info.facebook_link && (
                        <Link href={info.facebook_link} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                           <Facebook className="size-4" />
                        </Link>
                     )}
                     {info.x_link && (
                        <Link href={info.x_link} target="_blank" rel="noopener noreferrer" aria-label="X">
                           <Twitter className="size-4" />
                        </Link>
                     )}
                  </div>
               </div>
            </div>
         </div>
         <div className="flex justify-center items-center">
            ©{new Date().getFullYear()} {info.store_name}
         </div>
      </footer>
   );
};

export default Footer;
