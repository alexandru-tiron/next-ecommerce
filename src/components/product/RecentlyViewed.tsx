"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import ProductCard from "@/components/product-list/ProductCard";
import { getProductCards, ProductCardData } from "@/queries/fetchProductCards";
import { addRecentlyViewed, readRecentlyViewed, saveRecentlyViewed } from "./recentlyViewedStore";

const SHOWN = 5;

// Records the product being viewed (when currentProductId is set) and lists the other recently viewed products
const RecentlyViewed = ({ currentProductId, className }: { currentProductId?: string; className?: string }) => {
   const t = useTranslations("ProductPage");
   const [products, setProducts] = useState<ProductCardData[]>([]);

   useEffect(() => {
      const ids = readRecentlyViewed();
      if (currentProductId) saveRecentlyViewed(addRecentlyViewed(ids, currentProductId));

      const toShow = ids.filter((id) => id !== currentProductId).slice(0, SHOWN);
      let cancelled = false;
      getProductCards(toShow)
         .then((cards) => {
            if (!cancelled) setProducts(cards);
         })
         .catch((error) => console.error("Error loading recently viewed products:", error));
      return () => {
         cancelled = true;
      };
   }, [currentProductId]);

   if (products.length === 0) return null;

   return (
      <section className={className ?? "px-4 md:px-20 lg:px-16 xl:px-32 2xl:px-64 mb-16"}>
         <h2 className="text-2xl font-light mb-4">{t("recentlyViewed")}</h2>
         <div className="flex gap-x-6 gap-y-8 justify-left flex-wrap">
            {products.map((item) => (
               <ProductCard key={item.id} item={item} />
            ))}
         </div>
      </section>
   );
};

export default RecentlyViewed;
