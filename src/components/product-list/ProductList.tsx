"use client";
import { Product, SearchParams } from "@/types/product";
import { client } from "@/lib/algoliaClient";
import { useEffect, useState } from "react";
import Link from "next/link";
import ProductCard from "./ProductCard";
import Pagination from "./Pagination";
import { SearchResponse } from "@algolia/client-search";
import { useTranslations } from "next-intl";
import { buildFilters } from "@/lib/algoliaFilters";

const PRODUCT_PER_PAGE = 8;

const ProductList = ({ category, searchParams = {} }: { category?: string; searchParams?: SearchParams }) => {
   const [products, setProducts] = useState<Product[]>([]);
   const [totalPages, setTotalPages] = useState(0);
   const [currentPage, setCurrentPage] = useState(1);
   const [isLoading, setIsLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const t = useTranslations("ProductList");
   useEffect(() => {
      const fetchProducts = async () => {
         setIsLoading(true);
         setError(null);
         try {
            const searchRequest = {
               requests: [
                  {
                     indexName: searchParams.sort ? getSortByValue(searchParams.sort) : "products",
                     query: searchParams.name || "",
                     filters: buildFilters({ ...searchParams, cat: category || searchParams.cat }),
                     hitsPerPage: searchParams.limit || PRODUCT_PER_PAGE,
                     page: (Number(searchParams.page) || 1) - 1,
                  },
               ],
            };

            const { results } = await client.search(searchRequest);

            const searchResult = results[0] as SearchResponse<Product>;
            const mappedHits = searchResult.hits.map((hit) => ({
               ...hit,
               id: hit.objectID,
            }));
            setProducts(mappedHits);
            setTotalPages(searchResult.nbPages ?? 0);
            setCurrentPage((searchResult.page ?? 0) + 1);
         } catch (error) {
            console.error("Search error:", error);
            setError(t("errorSearch"));
         } finally {
            setIsLoading(false);
         }
      };

      fetchProducts();
   }, [category, searchParams, t]);

   if (isLoading) {
      return (
         <div className="mt-4 flex gap-x-8 gap-y-16 justify-left flex-wrap">
            {[...Array(PRODUCT_PER_PAGE)].map((_, index) => (
               <div key={index} className="w-full sm:w-[45%] md:w-[30%] lg:w-[18%] p-4 animate-pulse">
                  <div className="w-full h-44 md:h-80 bg-gray-200 rounded-lg mb-4" />
                  <div className="space-y-2">
                     <div className="h-4 bg-gray-200 rounded w-3/4" />
                     <div className="h-4 bg-gray-200 rounded w-1/2" />
                  </div>
               </div>
            ))}
         </div>
      );
   }

   if (error) {
      return (
         <div className="mt-8 text-center">
            <div className="text-red-600 mb-4">{error}</div>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
               {t("tryAgain")}
            </button>
         </div>
      );
   }

   if (products.length === 0) {
      return (
         <div className="mt-8 text-center">
            <div className="text-gray-600 mb-2 text-lg">{t("noProducts")}</div>
            <div className="text-gray-500 mb-4">{searchParams.name ? <span>{t("noProductsFound", { searchParams: searchParams.name })}</span> : <span>{t("noProductsFound2")}</span>}</div>
            <Link href="/list" className="inline-block px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
               {t("seeAllProducts")}
            </Link>
         </div>
      );
   }

   return (
      <div className="mt-4 flex gap-x-6 gap-y-8 justify-left flex-wrap" key={category ? category : products.length}>
         {products.map((item: Product) => (
            <ProductCard key={item.id} item={item} showBrand={!searchParams.brand} />
         ))}

         {!searchParams.limit && totalPages > 1 && <Pagination currentPage={currentPage} hasPrev={currentPage > 1} hasNext={currentPage < totalPages} />}
      </div>
   );
};

const getSortByValue = (sort: string) => {
   switch (sort) {
      case "asc price":
         return "products_price_asc";
      case "desc price":
         return "products_price_desc";
      case "desc created_at":
         return "products_created_at_desc";
      case "desc sold":
         return "products_sold_desc";
      default:
         return "products";
   }
};

export default ProductList;
