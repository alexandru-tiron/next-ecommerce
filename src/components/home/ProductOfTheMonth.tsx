import { getProductOfTheMonth } from "@/queries";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";

export const ProductOfTheMonth = async () => {
   const t = await getTranslations();
   const { product: productOfTheMonth, price } = await getProductOfTheMonth();
   if (!productOfTheMonth) return null;

   return (
      <section className="py-16 bg-white">
         <div className="container mx-auto px-4 md:px-8 lg:px-16 xl:px-32 2xl:px-64">
            <h2 className="text-3xl font-light mb-12 text-center">{t("HomePage.productOfTheMonth")}</h2>

            <div className="flex flex-col md:flex-row items-center gap-8">
               {/* Product Image */}
               <div className="w-full md:w-1/2 relative h-[400px]">
                  <Image src={productOfTheMonth.product_images[0]} alt={productOfTheMonth.name} fill className="object-contain" priority />
               </div>

               {/* Product Info */}
               <div className="w-full md:w-1/2 flex flex-col gap-4">
                  <h3 className="text-2xl font-medium">{productOfTheMonth.name}</h3>
                  <p className="text-gray-600">{productOfTheMonth.short_description}</p>
                  {price && price.discount ? (
                     <div className="flex flex-col relative self-end mr-2">
                        <h3
                           className="text-base text-gray-700  absolute bottom-7 left-9 "
                           style={{
                              left: productOfTheMonth.sku_variants && productOfTheMonth.sku_variants.length > 0 ? "5rem" : " ",
                           }}
                        >
                           {price.price[0]}
                           <sup className=" text-[0.6rem] leading-none -top-[0.3rem]">{price.price[1]}</sup>
                           Lei
                           <div className="absolute bottom-[calc(50%-1px)] left-0 h-[1.5px] w-full bg-gray-700" />
                        </h3>
                        <h2 className="font-medium text-3xl text-pink-700 ">
                           {productOfTheMonth.sku_variants && productOfTheMonth.sku_variants.length > 0 && <span className=" text-base font-normal text-gray-700">{t("ProductList.from")}</span>}
                           {price.discount[0]}
                           <sup className=" text-sm leading-none -top-3">{price.discount[1]}</sup> <span className=" text-base">Lei</span>
                        </h2>
                     </div>
                  ) : (
                     <h2 className="font-medium text-3xl text-pink-700 self-end mr-2">
                        {productOfTheMonth.sku_variants && productOfTheMonth.sku_variants.length > 0 && <span className=" text-sm font-normal text-gray-700">{t("ProductList.from")}</span>}
                        {price && price.price[0]}
                        <sup className=" text-sm leading-none -top-3">{price && price.price[1]}</sup> <span className=" text-base">Lei</span>
                     </h2>
                  )}
                  <Link href={`/product/${productOfTheMonth.name.trim().replaceAll(" ", "-")}?id=${productOfTheMonth.id}`} className="inline-block w-fit px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors">
                     {t("Orders.viewDetails")}
                  </Link>
               </div>
            </div>
         </div>
      </section>
   );
};
