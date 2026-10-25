import Slider from "../components/home/Slider";
import { ReactNode, Suspense } from "react";
import Skeleton from "../components/product-list/Skeleton";
import ProductList from "../components/product-list/ProductList";
import CategoryList from "../components/home/CategoryList";
import { FeaturedBrands } from "../components/home/FeaturedBrands";
import { WhyChooseUs } from "../components/home/WhyChooseUs";
import { ProductOfTheMonth } from "../components/home/ProductOfTheMonth";
import RecentlyViewed from "../components/product/RecentlyViewed";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { HomeSectionId } from "@core/settings";
import { getCategData, getHomeLayout, getSlides } from "@/lib/server/storeData";

// The home page sections, in the order and with the visibility set in Admin → Settings → Home & footer
export default async function Home() {
   const [t, slides, categories, layout] = await Promise.all([getTranslations("HomePage"), getSlides(), getCategData(), getHomeLayout()]);
   // Plain objects only: these are passed to client components
   const initialSlides = slides.map(({ order, title, description, image, url, background }) => ({ order, title, description, image, url, background }));

   const productRow = (title: string, sort: string) => (
      <section className="py-16 bg-white">
         <div className="container mx-auto px-4 md:px-8 lg:px-16 xl:px-32 2xl:px-64">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10">
               <h2 className="text-3xl font-light">{title}</h2>
               <Link href={`/list?sort=${sort.replace(" ", "+")}`} className="mt-2 md:mt-0 text-sm hover:underline">
                  {t("seeAll")} →
               </Link>
            </div>
            <Suspense fallback={<Skeleton />}>
               <ProductList searchParams={{ sort, limit: 5 }} />
            </Suspense>
         </div>
      </section>
   );

   const sections: Record<HomeSectionId, () => ReactNode> = {
      slider: () => <Slider initialSlides={initialSlides} />,
      categories: () => (
         <section className="py-16">
            <div className="relative lg:container mx-auto px-2 md:px-4 lg:px-8 xl:px-16 2xl:px-32">
               <h2 className="text-3xl font-light mb-12 text-center">{t("categories")}</h2>
               <Suspense fallback={<Skeleton />}>
                  <CategoryList initialCategories={categories} />
               </Suspense>
            </div>
         </section>
      ),
      bestSellers: () => productRow(t("bestSellers"), "desc sold"),
      productOfTheMonth: () => <ProductOfTheMonth />,
      whyChooseUs: () => <WhyChooseUs />,
      newArrivals: () => productRow(t("newArrivals"), "desc created_at"),
      // Only rendered when the visitor has viewed products
      recentlyViewed: () => <RecentlyViewed className="container mx-auto px-4 md:px-8 lg:px-16 xl:px-32 2xl:px-64 py-16" />,
      brands: () => <FeaturedBrands />,
   };

   return (
      <main className="min-h-screen bg-gray-50">
         {layout.sections
            .filter((section) => section.enabled)
            .map((section) => (
               <div key={section.id}>{sections[section.id]()}</div>
            ))}
      </main>
   );
}
