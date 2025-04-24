import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getBrandData } from "@/queries";

export const FeaturedBrands = async () => {
   const brands = await getBrandData();
   const t = await getTranslations("HomePage");
   return (
      <section className="py-16 bg-white">
         <div className="container mx-auto px-4 md:px-8 lg:px-16 xl:px-32 2xl:px-64">
            <h2 className="text-3xl font-light mb-12 text-center">{t("featuredBrands")}</h2>

            <div className="flex flex-wrap justify-center max-w-5xl mx-auto">
               {brands.slice(0, 12).map((brand) => (
                  <Link
                     href={`/list?brand=${encodeURIComponent(brand.name)}`}
                     key={brand.id}
                     className="flex items-center justify-center p-2 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all hover:scale-105 h-20 m-2
                        w-[calc(50%-1rem)] sm:w-[calc(33.333%-1rem)] md:w-[calc(25%-1rem)] lg:w-[calc(16.666%-1rem)]"
                  >
                     {brand.image ? <Image src={brand.image} alt={brand.name} width={120} height={80} className="object-contain max-h-16" /> : <span className="text-center font-medium text-gray-800">{brand.name}</span>}
                  </Link>
               ))}
            </div>

            <div className="text-center mt-8">
               <Link href="/list" className="inline-block px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors text-sm">
                  {t("viewAllBrands")}
               </Link>
            </div>
         </div>
      </section>
   );
};
