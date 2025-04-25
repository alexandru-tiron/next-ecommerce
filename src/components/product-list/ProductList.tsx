"use client";
import { Product, SearchParams } from "@/types/product";
import { client } from "@/lib/algoliaClient";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { twMerge } from "tailwind-merge";
import Pagination from "./Pagination";
import { SearchResponse } from "@algolia/client-search";
import { useTranslations } from "next-intl";

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
         const filterConditions = [];

         if (category || searchParams.cat) {
            filterConditions.push(`category_name:'${(category || searchParams.cat)?.replace(/'/g, "\\'")}'`);
         }

         if (searchParams.subcat) {
            filterConditions.push(`subcategory_name:'${searchParams.subcat?.replace(/'/g, "\\'")}'`);
         }

         if (searchParams.brand) {
            filterConditions.push(`brand:'${searchParams.brand?.replace(/'/g, "\\'")}'`);
         }

         if (searchParams.size) {
            filterConditions.push(`sku_variants.name:'${searchParams.size}'`);
         }

         if (searchParams.min) {
            filterConditions.push(`price >= ${searchParams.min}`);
         }

         if (searchParams.max) {
            filterConditions.push(`price <= ${searchParams.max}`);
         }

         try {
            const searchRequest = {
               requests: [
                  {
                     indexName: searchParams.sort ? getSortByValue(searchParams.sort) : "products",
                     query: searchParams.name || "",
                     filters: filterConditions.length > 0 ? filterConditions.join(" AND ") : undefined,
                     hitsPerPage: searchParams.limit || PRODUCT_PER_PAGE,
                     page: (Number(searchParams.page) || 1) - 1,
                  },
               ],
            };

            console.log("Search request:", searchRequest);
            const { results } = await client.search(searchRequest);
            console.log("Search response:", results[0]);

            const searchResult = results[0] as SearchResponse<Product>;
            const mappedHits = searchResult.hits.map((hit) => ({
               ...hit,
               id: hit.objectID,
            }));
            console.log(mappedHits);
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
   }, [category, searchParams.brand, searchParams.cat, searchParams.max, searchParams.min, searchParams.name, searchParams.page, searchParams.sort, searchParams.size, searchParams.subcat, searchParams.limit]);

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
         {products.map((item: Product) => {
            const price =
               item.sku_variants && item.sku_variants.length > 0
                  ? {
                       price: item.sku_variants
                          .sort((a, b) => a.price - b.price)[0]
                          .price?.toFixed(2)
                          .split(".")
                          .map(Number) || [0, 0],
                       discount: item.sku_variants
                          .sort((a, b) => a.price - b.price)[0]
                          .discount_price?.toFixed(2)
                          .split(".")
                          .map(Number),
                    }
                  : {
                       price: item.price?.toFixed(2).split(".").map(Number) || [0, 0],
                       discount: item.discount_price?.toFixed(2)?.split(".")?.map(Number),
                    };

            const images = item.product_images || [];

            return (
               <Link href={`/product/${item.name.trim().replaceAll(" ", "-")}?id=${item.id}`} className="w-full flex flex-col gap-2 sm:w-[45%] md:w-[30%] lg:w-[18%] hover:shadow-[0px_0px_15px_-3px_rgb(0,0,0,0.1)] p-4" key={item.id}>
                  <div className="relative w-full h-44 md:h-80 rounded-lg bg-white">
                     <Image src={images[0] || "/product.svg"} alt="" fill sizes="100%" className={twMerge("absolute object-contain  opacity-100 transition-opacity easy duration-500", images.length > 1 && "hover:opacity-0 ")} />
                     {images.length > 1 && <Image src={images[1] || "/product.svg"} alt="" fill sizes="100%" className="absolute object-contain opacity-0 transition-opacity easy duration-500 hover:opacity-100 bg-white" />}
                  </div>
                  <div className="flex flex-col gap-1  ">
                     {!searchParams.brand && <span className=" text-gray-600 underline text-sm">{item.brand}</span>}
                     <span className="font-medium text-lg text-ellipsis  line-clamp-2">{item.name}</span>
                     <span className=" text-gray-600 text-xs text-ellipsis  line-clamp-2">{item.short_description}</span>
                  </div>
                  <div className=" flex flex-col gap-1  pt-2 mt-auto max-w-max self-end">
                     {price && price.discount ? (
                        <div className="flex flex-col relative self-end mr-2">
                           <h3
                              className="text-[0.85rem] text-gray-700 absolute bottom-6 "
                              style={{
                                 left: price.discount ? "3.5rem" : " ",
                              }}
                           >
                              {price.price[0]}
                              <sup className=" text-[0.5rem] leading-none -top-[0.3rem]">{price.price[1]}</sup>
                              Lei
                              <div className="absolute bottom-[calc(50%-1px)] left-0 h-[1px] w-full bg-gray-700" />
                           </h3>
                           <h2 className="font-medium text-2xl text-pink-700 ">
                              {item.sku_variants && item.sku_variants.length > 0 && <span className=" text-base font-normal text-gray-700">{t("from")}</span>}
                              {price.discount[0]}
                              <sup className=" text-xs leading-none -top-2">{price.discount[1]}</sup>
                              <span className=" text-base">Lei</span>
                           </h2>
                        </div>
                     ) : (
                        <h2 className="font-medium text-2xl text-pink-700 self-end mr-2">
                           {item.sku_variants && item.sku_variants.length > 0 && <span className=" text-sm font-normal text-gray-700">{t("from")}</span>}
                           {price && price.price[0]}
                           <sup className=" text-xs leading-none -top-2">{price && price.price[1]}</sup>
                           <span className=" text-base">Lei</span>
                        </h2>
                     )}
                     <button className="rounded-2xl bg-black text-white w-max py-2 px-4 text-xs hover:bg-lama hover:text-white ml-auto  ">{t("addToCart")}</button>
                  </div>
               </Link>
            );
         })}

         {(searchParams.cat || searchParams.name) && <Pagination currentPage={currentPage} hasPrev={currentPage > 1} hasNext={currentPage < totalPages} />}
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
