"use client";

import { Product, Review, SkuVariant, VARIANT_TYPE, Variant } from "@/types/product";
import React, { useEffect, useState } from "react";
import ProductImages from "./ProductImages";
import { twMerge } from "tailwind-merge";
import Add from "./Add";
import { Reviews } from "./Reviews";
import Link from "next/link";
import { useTranslations } from "next-intl";
async function trowError(e: HTMLUListElement) {
   e.classList.add("animate-outline-flash");
   // e.classList.add("animate-bounce")
   setTimeout(function () {
      e.classList.remove("animate-outline-flash");
      // e.classList.remove("animate-bounce");
   }, 1400);
}
const ProductContent = ({ product, variants, skuVariants, reviews }: { product: Product; variants: Variant[]; skuVariants: SkuVariant[]; reviews: Review[] }) => {
   // Client-side state for user selections
   const t = useTranslations("ProductPage");
   const [price, setPrice] = useState<{ price: number[]; discount?: number[] } | null>(null);
   const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
   const [selectedSkuVariant, setSelectedSkuVariant] = useState<SkuVariant | null>(null);

   useEffect(() => {
      if (selectedSkuVariant) {
         setPrice({
            price: selectedSkuVariant.price.toFixed(2).split(".").map(Number),
            discount: selectedSkuVariant.discount_price?.toFixed(2).split(".").map(Number),
         });
      } else if (skuVariants.length > 0) {
         setPrice({
            price: skuVariants
               .sort((a, b) => a.price - b.price)[0]
               .price.toFixed(2)
               .split(".")
               .map(Number),
            discount: skuVariants
               .sort((a, b) => a.price - b.price)[0]
               .discount_price?.toFixed(2)
               .split(".")
               .map(Number),
         });
      } else {
         setPrice({
            price: product.price.toFixed(2).split(".").map(Number),
            discount: product.discount_price?.toFixed(2).split(".").map(Number),
         });
      }
   }, [product.discount_price, product.price, selectedSkuVariant, skuVariants]);

   const flashVariants = (type: string) => {
      document.querySelectorAll("." + type).forEach((i) => trowError(i as HTMLUListElement));
   };

   return (
      <div className=" mt-8 mb-24">
         <div className="px-4 md:px-20 lg:px-16 xl:px-32 2xl:px-64 relative flex gap-1 text-sm font-semibold">
            <Link href={`/list?cat=${product.category_name}`}>{product.category_name}</Link>
            <span>{">"}</span>
            <Link href={`/list?subcat=${product.subcategory_name}&cat=${product.category_name}`}>{product.subcategory_name}</Link>
         </div>
         <div className="pt-10 px-4 md:px-20 lg:px-16 xl:px-32 2xl:px-64 relative flex flex-col lg:flex-row gap-14">
            {/* IMG */}
            <div className="w-full lg:w-1/2 lg:sticky top-20 h-max">
               <ProductImages items={product.product_images} selected={selectedVariant ? selectedVariant.media : undefined} />
            </div>
            {/* TEXTS */}
            <div className="w-full lg:w-1/2 flex flex-col gap-4">
               <h1 className="text-4xl font-medium">{product.name}</h1>
               <Link href={`/list?brand=${product.brand}`} className=" text-sm font-semibold">
                  {t("brand")}: {product.brand}
               </Link>
               <p className="text-gray-500">{product.short_description}</p>
               <div className="h-[2px] bg-gray-100" />
               {price && price.discount ? (
                  <div className="flex flex-col relative ">
                     <h3 className="text-[0.85rem] text-gray-700 absolute bottom-6 left-10 ">
                        {price.price[0]}
                        <sup className=" text-[0.495rem] leading-none -top-[0.3rem]">{price.price[1]}</sup>
                        Lei
                        <div className="absolute bottom-[calc(50%-1px)] left-0 h-[1px] w-full bg-gray-700" />
                     </h3>
                     <h2 className="font-medium text-2xl text-pink-700 ">
                        {!selectedSkuVariant && skuVariants.length > 0 && <span className=" text-base font-normal text-gray-700">{t("from")}</span>}
                        {price.discount[0]}
                        <sup className=" text-xs leading-none -top-2">{price.discount[1]}</sup> Lei
                     </h2>
                  </div>
               ) : (
                  <h2 className="font-medium text-2xl text-pink-700">
                     {!selectedSkuVariant && skuVariants.length > 0 && <span className=" text-base font-normal text-gray-700">{t("from")}</span>}
                     {price && price.price[0]}
                     <sup className=" text-xs leading-none -top-2">{price && price.price[1]}</sup> Lei
                  </h2>
               )}
               <div className="h-[2px] bg-gray-100" />

               {variants.length >= 1 ? (
                  <>
                     <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-4">
                           <h4 className="text-sm font-semibold">{t("chooseOption")}</h4>
                           <ul className="flex items-center gap-2">
                              {variants.map((option) => {
                                 if (option.type === VARIANT_TYPE.MEDIA) {
                                    return (
                                       <li
                                          className="variant cursor-pointer w-20 h-20 flex flex-row justify-center items-center rounded-lg hover:border-black hover:border-2"
                                          style={{
                                             // backgroundColor: option.code,
                                             border: selectedVariant && selectedVariant.id === option.id ? "2px solid rgb(190 24 93)" : "",
                                          }}
                                          onClick={() => setSelectedVariant(option)}
                                          key={option.id}
                                       >
                                          <p
                                             style={{
                                                // backgroundColor: option.code,
                                                backgroundImage: `url("${option.media}")`,
                                                backgroundRepeat: "no-repeat",
                                                backgroundSize: "cover",
                                                backgroundPosition: "center",
                                                backgroundColor: "#fff",
                                             }}
                                             className="relative group w-full h-full  rounded-lg"
                                          >
                                             <span
                                                className="absolute bottom-[102%] left-1/2 transform -translate-x-1/2 mb-2 text-white bg-black p-2 rounded-full opacity-0 invisible w-auto
                          group-hover:opacity-100 group-hover:visible transition-opacity text-xs whitespace-nowrap truncate"
                                             >
                                                {option.code ? option.code + " " + option.name : option.name}
                                             </span>
                                          </p>
                                       </li>
                                    );
                                 } else if (option.type === VARIANT_TYPE.COLOUR) {
                                    return (
                                       <li
                                          className="variant cursor-pointer w-12 h-12 flex flex-row justify-center items-center rounded-full hover:border-black hover:border-2 p-1"
                                          style={{
                                             // backgroundColor: option.code,
                                             border: selectedVariant && selectedVariant.id === option.id ? "2px solid rgb(190 24 93)" : "",
                                             padding: selectedVariant && selectedVariant.id === option.id ? "0.25rem" : "",
                                          }}
                                          onClick={() => setSelectedVariant(option)}
                                          key={option.id}
                                       >
                                          <p className="relative group w-full h-full rounded-full" style={{ backgroundColor: option.media }}>
                                             <span
                                                className="absolute bottom-[102%] left-1/2 transform -translate-x-1/2 mb-2 text-white bg-black p-2 rounded-full opacity-0 invisible w-auto
                    group-hover:opacity-100 group-hover:visible transition-opacity text-xs whitespace-nowrap truncate"
                                             >
                                                {option.code ? option.code + " " + option.name : option.name}
                                             </span>
                                          </p>
                                       </li>
                                    );
                                 } else return null;
                              })}
                           </ul>
                        </div>
                     </div>
                     <div className="h-[2px] bg-gray-100" />
                  </>
               ) : null}

               {skuVariants.length >= 1 ? (
                  <>
                     <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-4">
                           <ul className="flex items-center gap-3">
                              {skuVariants
                                 .sort((a, b) => (parseInt(a.name) > parseInt(b.name) ? 1 : -1))
                                 .map((option) => {
                                    return (
                                       <li
                                          className={twMerge("skuVariant rounded-lg border-2 border-pink-700 ring-gray-300 py-1 px-4 text-sm   cursor-pointer", selectedSkuVariant && selectedSkuVariant.id === option.id ? " bg-pink-700 text-white font-semibold" : " bg-white text-pink-700")}
                                          onClick={() => setSelectedSkuVariant(option)}
                                          key={option.id}
                                       >
                                          {option.name}
                                       </li>
                                    );
                                 })}
                           </ul>
                        </div>
                     </div>
                     <div className="h-[2px] bg-gray-100" />
                  </>
               ) : null}

               <Add
                  product_id={product.id}
                  product_name={product.name}
                  product_code={product.product_code}
                  product_image={product.product_images[0]}
                  product_price={product.price}
                  variants={variants.length > 0}
                  variantsError={() => flashVariants("variant")}
                  selectedVariant={selectedVariant}
                  sku_variants={skuVariants.length > 0}
                  skuVariantsError={() => flashVariants("skuVariant")}
                  selectedSkuVariant={selectedSkuVariant}
                  stoc={product.stoc}
               />

               {product.long_description && (
                  <>
                     <div className="h-[2px] bg-gray-100" />
                     <div>
                        <h4 className="text-sm font-semibold mb-2">{t("description")}</h4>
                        <p className="text-gray-500">{product.long_description}</p>
                     </div>
                  </>
               )}
               {product.how_to && (
                  <>
                     <div className="h-[2px] bg-gray-100" />
                     <div>
                        <h4 className="text-sm font-semibold mb-2">{t("howTo")}</h4>
                        <p className="text-gray-500">{product.how_to}</p>
                     </div>
                  </>
               )}
               {/* REVIEWS */}
               {reviews.length > 0 && (
                  <>
                     <div className="h-[2px] bg-gray-100" />
                     <h1 className="text-2xl">{t("reviews")}</h1>
                     <Reviews reviews={reviews} />
                  </>
               )}
            </div>
         </div>
      </div>
   );
};
export default ProductContent;
