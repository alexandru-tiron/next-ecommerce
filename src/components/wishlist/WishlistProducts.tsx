"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import ProductCard from "@/components/product-list/ProductCard";
import { getProductCards, ProductCardData } from "@/queries/fetchProductCards";
import { useWishlist } from "./wishlistStore";

const WishlistProducts = () => {
   const t = useTranslations("Wishlist");
   const { ids } = useWishlist();
   const [products, setProducts] = useState<ProductCardData[] | null>(null);

   useEffect(() => {
      let cancelled = false;
      getProductCards(ids)
         .then((cards) => {
            if (!cancelled) setProducts(cards);
         })
         .catch((error) => {
            console.error("Error loading the wishlist:", error);
            if (!cancelled) setProducts([]);
         });
      return () => {
         cancelled = true;
      };
   }, [ids]);

   if (products === null) {
      return <div className="h-40 flex items-center justify-center text-gray-400">{t("loading")}</div>;
   }

   if (products.length === 0) {
      return (
         <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 text-center">
            <Heart className="w-12 h-12 text-gray-300" />
            <p className="text-lg text-gray-600">{t("empty")}</p>
            <Link href="/list" className="rounded-md bg-black text-white py-2 px-4">
               {t("browse")}
            </Link>
         </div>
      );
   }

   return (
      <div className="flex gap-x-6 gap-y-8 justify-left flex-wrap">
         {products.map((item) => (
            <ProductCard key={item.id} item={item} />
         ))}
      </div>
   );
};

export default WishlistProducts;
