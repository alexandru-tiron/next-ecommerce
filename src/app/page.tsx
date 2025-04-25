import Slider from "../components/home/Slider";
import { Suspense } from "react";
import Skeleton from "../components/product-list/Skeleton";
import ProductList from "../components/product-list/ProductList";
import CategoryList from "../components/home/CategoryList";
import { FeaturedBrands } from "../components/home/FeaturedBrands";
import { WhyChooseUs } from "../components/home/WhyChooseUs";
import { ProductOfTheMonth } from "../components/home/ProductOfTheMonth";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function Home() {
   const t = await getTranslations("HomePage");
   return (
      <main className="min-h-screen bg-gray-50">
         {/* Hero Section */}
         <Slider />

         {/* Categories Section */}
         <section className="py-16">
            <div className="relative lg:container mx-auto px-2 md:px-4 lg:px-8 xl:px-16 2xl:px-32">
               <h1 className="text-3xl font-light mb-12 text-center">{t("categories")}</h1>
               <Suspense fallback={<Skeleton />}>
                  <CategoryList />
               </Suspense>
            </div>
         </section>

         {/* Best Sellers Section */}
         <section className="py-16 bg-white">
            <div className="container mx-auto px-4 md:px-8 lg:px-16 xl:px-32 2xl:px-64">
               <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10">
                  <h2 className="text-3xl font-light">{t("bestSellers")}</h2>
                  <Link href="/list?sort=desc+sold" className="mt-2 md:mt-0 text-sm hover:underline">
                     {t("seeAll")} →
                  </Link>
               </div>
               <Suspense fallback={<Skeleton />}>
                  <ProductList searchParams={{ sort: "desc sold", limit: 5 }} />
               </Suspense>
            </div>
         </section>

         {/* Product of the Month Section */}
         <ProductOfTheMonth />

         {/* Why Choose Us Section */}
         <WhyChooseUs />

         {/* New Arrivals Section */}
         <section className="py-16 bg-white">
            <div className="container mx-auto px-4 md:px-8 lg:px-16 xl:px-32 2xl:px-64">
               <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-10">
                  <h2 className="text-3xl font-light">{t("newArrivals")}</h2>
                  <Link href="/list?sort=desc+created_at" className="mt-2 md:mt-0 text-sm hover:underline">
                     {t("seeAll")} →
                  </Link>
               </div>
               <Suspense fallback={<Skeleton />}>
                  <ProductList searchParams={{ sort: "desc created_at", limit: 5 }} />
               </Suspense>
            </div>
         </section>

         {/* Featured Brands Section */}
         <FeaturedBrands />
      </main>
   );
}
