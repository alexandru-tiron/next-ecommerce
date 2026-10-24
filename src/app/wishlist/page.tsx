import { getTranslations } from "next-intl/server";
import { Metadata } from "next";
import WishlistProducts from "@/components/wishlist/WishlistProducts";

export async function generateMetadata(): Promise<Metadata> {
   const t = await getTranslations("Wishlist");
   return { title: t("title"), robots: { index: false } };
}

export default async function WishlistPage() {
   const t = await getTranslations("Wishlist");
   return (
      <div className="pt-8 pb-24 px-4 md:px-8 lg:px-16 xl:px-32 2xl:px-64">
         <h1 className="text-2xl font-medium mb-6">{t("title")}</h1>
         <WishlistProducts />
      </div>
   );
}
