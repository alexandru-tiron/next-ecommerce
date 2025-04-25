import { SearchParams } from "@/types/product";
import Filter from "@/components/product-list/Filter";
import ProductList from "@/components/product-list/ProductList";
import Skeleton from "@/components/product-list/Skeleton";
import SortProducts from "@/components/product-list/SortProducts";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
export default async function ListPage({ searchParams }: { searchParams: SearchParams }) {
   const params = await searchParams;
   const t = await getTranslations("ProductList");
   return (
      <div className="mb-24 pt-8 px-4 md:px-8 lg:px-16 xl:px-32 2xl:px-64">
         <div className="relative flex gap-6">
            <Filter params={params} />
            <div className="flex-1">
               <div className="flex items-center justify-between mb-6 gap-4">
                  <div className="flex-1 min-w-0">
                     {params.name && (
                        <h1 className="text-xl font-medium text-gray-800 truncate">
                           {t("resultsFor")}: <span className="text-gray-600">{params.name}</span>
                        </h1>
                     )}
                  </div>
                  <div className="flex-shrink-0">
                     <SortProducts currentSort={params.sort} />
                  </div>
               </div>
               <Suspense fallback={<Skeleton />}>
                  <ProductList category={params.cat} searchParams={params} />
               </Suspense>
            </div>
         </div>
      </div>
   );
}
