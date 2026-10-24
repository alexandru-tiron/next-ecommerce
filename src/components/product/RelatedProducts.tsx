import { useTranslations } from "next-intl";
import ProductCard from "@/components/product-list/ProductCard";
import type { ProductCardData } from "@/queries/fetchProductCards";

const RelatedProducts = ({ products }: { products: ProductCardData[] }) => {
   const t = useTranslations("ProductPage");
   if (products.length === 0) return null;

   return (
      <section className="px-4 md:px-20 lg:px-16 xl:px-32 2xl:px-64 mb-16">
         <h2 className="text-2xl font-light mb-4">{t("relatedProducts")}</h2>
         <div className="flex gap-x-6 gap-y-8 justify-left flex-wrap">
            {products.map((item) => (
               <ProductCard key={item.id} item={item} />
            ))}
         </div>
      </section>
   );
};

export default RelatedProducts;
