import { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { formatMoney } from "@core/format";
import { InfoPageId, Locale } from "@core/settings";
import { infoPageTemplate } from "@/lib/infoPageTemplates";
import { sanitizeRichText } from "@/lib/server/sanitizeHtml";
import { getInfoData, getInfoPage, getLocalization, getShippData, getTaxData } from "@/lib/server/storeData";

export async function infoPageMetadata(id: InfoPageId): Promise<Metadata> {
   const t = await getTranslations("InfoPages");
   return { title: t(id) };
}

// An information page: the store's own text for the visitor's language (Admin → Settings → Pages),
// or the built-in template filled in with the store's details
export default async function InfoPage({ id }: { id: InfoPageId }) {
   const [locale, t, page, info, shipping, tax, localization] = await Promise.all([getLocale(), getTranslations("InfoPages"), getInfoPage(id), getInfoData(), getShippData(), getTaxData(), getLocalization()]);
   const html =
      page.content[locale as Locale] ??
      infoPageTemplate(id, locale as Locale, { info, shipping, vatRate: tax.vat_rate, money: (amount) => formatMoney(amount, localization.currency, locale) });

   return (
      <article className="py-10 px-6 md:px-20 lg:px-64">
         <h1 className="text-3xl font-bold mb-8 text-center">{t(id)}</h1>
         <div className="store-prose mx-auto max-w-3xl" dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }} />
      </article>
   );
}
