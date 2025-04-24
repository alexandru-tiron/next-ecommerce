"use client";

import { SkuVariant, Variant } from "@/types/product";
import { useCartContext } from "@/context/CartContext";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
const Add = ({
   product_id,
   product_name,
   product_code,
   product_image,
   product_price,
   variants,
   variantsError,
   selectedVariant,
   sku_variants,
   skuVariantsError,
   selectedSkuVariant,
   stoc = 5,
}: {
   product_id: string;
   product_name: string;
   product_code: string;
   product_image: string;
   product_price: number;
   variants: boolean;
   variantsError?: () => void;
   selectedVariant?: Variant | null;
   sku_variants: boolean;
   skuVariantsError?: () => void;
   selectedSkuVariant?: SkuVariant | null;
   stoc?: number;
}) => {
   const [quantity, setQuantity] = useState(1);
   const router = useRouter();
   const t = useTranslations("ProductPage");
   // // TEMPORARY
   // const stock = 4;

   const handleQuantity = (type: "i" | "d") => {
      if (type === "d" && quantity > 1) {
         setQuantity((prev) => prev - 1);
      }
      if (type === "i" && quantity < stoc) {
         setQuantity((prev) => prev + 1);
      }
   };

   const { addItem, isLoading } = useCartContext();

   return (
      <div className="flex flex-col gap-4">
         <h4 className="text-sm font-semibold">{t("chooseQuantity")}</h4>
         <div className="flex justify-between">
            <div className="flex items-center gap-4">
               <div className="bg-gray-100 py-2 px-4 rounded-3xl flex items-center justify-between w-32">
                  <button className="cursor-pointer text-xl disabled:cursor-not-allowed disabled:opacity-20" onClick={() => handleQuantity("d")} disabled={quantity === 1}>
                     -
                  </button>
                  {quantity}
                  <button className="cursor-pointer text-xl disabled:cursor-not-allowed disabled:opacity-20" onClick={() => handleQuantity("i")} disabled={quantity === stoc}>
                     +
                  </button>
               </div>
               {stoc < 1 ? (
                  <div className="text-xs">{t("outOfStock")}</div>
               ) : (
                  <div className="text-xs">
                     {t("only")} <span className="text-orange-500">{stoc} {t("piecesLeft")}</span> {t("onStock")}
                     <br /> {t("dontMiss")}
                  </div>
               )}
            </div>
            <button
               onClick={() => {
                  if (variants && !selectedVariant) {
                     if (variantsError) {
                        variantsError();
                     } else {
                        router.push(`/${product_name}?id=${product_id}`);
                     }
                  } else if (sku_variants && !selectedSkuVariant) {
                     if (skuVariantsError) {
                        skuVariantsError();
                     } else {
                        router.push(`/${product_name}?id=${product_id}`);
                     }
                  } else {
                     addItem(
                        product_id,
                        product_name,
                        product_code,
                        product_image,
                        product_price,
                        quantity,
                        selectedVariant ? selectedVariant.id : undefined,
                        selectedVariant ? selectedVariant.name : undefined,
                        selectedSkuVariant ? selectedSkuVariant.id : undefined,
                        selectedSkuVariant ? selectedSkuVariant.name : undefined
                     );
                  }
               }}
               disabled={isLoading}
               className="w-36 text-sm font-semibold rounded-3xl border-2 border-pink-700 text-pink-700 py-2 px-4 hover:border-none hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:bg-pink-200 disabled:ring-0 disabled:text-white disabled:ring-none"
            >
               {t("addToCart")}
            </button>
         </div>
      </div>
   );
};

export default Add;
