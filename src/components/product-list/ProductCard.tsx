import Link from "next/link";
import Image from "next/image";
import { twMerge } from "tailwind-merge";
import { useTranslations } from "next-intl";
import { cardPrice, productPath } from "@/lib/productUrl";
import type { ProductCardData } from "@/queries/fetchProductCards";
import WishlistButton from "@/components/wishlist/WishlistButton";
import { PriceTag } from "@/components/common/Price";

// Image widths matching the card widths: full, sm:45%, md:30%, lg:18%
const CARD_IMAGE_SIZES = "(min-width: 1024px) 18vw, (min-width: 768px) 30vw, (min-width: 640px) 45vw, 100vw";

// Product tile used by the product list, related products and recently viewed products
const ProductCard = ({ item, showBrand = true, className }: { item: ProductCardData; showBrand?: boolean; className?: string }) => {
   const t = useTranslations("ProductList");
   const price = cardPrice(item);
   const images = item.product_images || [];

   return (
      <Link href={productPath(item)} className={twMerge("w-full flex flex-col gap-2 sm:w-[45%] md:w-[30%] lg:w-[18%] hover:shadow-[0px_0px_15px_-3px_rgb(0,0,0,0.1)] p-4", className)}>
         <div className="relative w-full h-44 md:h-80 rounded-lg bg-white">
            <WishlistButton productId={item.id} size={18} className="absolute top-2 right-2 z-10" />
            <Image src={images[0] || "/product.svg"} alt="" fill sizes={CARD_IMAGE_SIZES} className={twMerge("absolute object-contain  opacity-100 transition-opacity easy duration-500", images.length > 1 && "hover:opacity-0 ")} />
            {images.length > 1 && <Image src={images[1] || "/product.svg"} alt="" fill sizes={CARD_IMAGE_SIZES} className="absolute object-contain opacity-0 transition-opacity easy duration-500 hover:opacity-100 bg-white" />}
         </div>
         <div className="flex flex-col gap-1  ">
            {showBrand && <span className=" text-gray-600 underline text-sm">{item.brand}</span>}
            <span className="font-medium text-lg text-ellipsis  line-clamp-2">{item.name}</span>
            <span className=" text-gray-600 text-xs text-ellipsis  line-clamp-2">{item.short_description}</span>
         </div>
         <div className=" flex flex-col gap-1  pt-2 mt-auto max-w-max self-end">
            {price.discount ? (
               <div className="flex flex-col relative self-end mr-2">
                  <h3
                     className="text-[0.85rem] text-gray-700 absolute bottom-6 "
                     style={{
                        left: price.discount ? "3.5rem" : " ",
                     }}
                  >
                     {<PriceTag amount={Number(price.price.join("."))} supClassName="text-[0.5rem] leading-none -top-[0.3rem]" />}
                     <div className="absolute bottom-[calc(50%-1px)] left-0 h-[1px] w-full bg-gray-700" />
                  </h3>
                  <h2 className="font-medium text-2xl text-brand-700 ">
                     {price.fromPrice && <span className=" text-base font-normal text-gray-700">{t("from")}</span>}
                     {<PriceTag amount={Number(price.discount.join("."))} supClassName="text-xs leading-none -top-2" currencyClassName="text-base" />}
                  </h2>
               </div>
            ) : (
               <h2 className="font-medium text-2xl text-brand-700 self-end mr-2">
                  {price.fromPrice && <span className=" text-sm font-normal text-gray-700">{t("from")}</span>}
                  {<PriceTag amount={Number(price.price.join("."))} supClassName="text-xs leading-none -top-2" currencyClassName="text-base" />}
               </h2>
            )}
            <button className="rounded-2xl bg-black text-white w-max py-2 px-4 text-xs hover:bg-lama hover:text-white ml-auto  ">{t("addToCart")}</button>
         </div>
      </Link>
   );
};

export default ProductCard;
