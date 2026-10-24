import type { MetadataRoute } from "next";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebaseInit";
import { productPath } from "@/lib/productUrl";
import { siteUrl } from "@/lib/siteUrl";

// Built on request so the build doesn't depend on reaching Firestore
export const dynamic = "force-dynamic";

const STATIC_PATHS = [
   "",
   "/list",
   "/info/about-us",
   "/info/contact",
   "/info/delivery-and-payment",
   "/info/how-to-buy",
   "/info/privacy-policy",
   "/info/return",
   "/info/terms-and-conditions",
];

const toDate = (value: unknown) => (value instanceof Timestamp ? value.toDate() : undefined);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
   const [productsSnap, categoriesSnap] = await Promise.all([getDocs(collection(db, "Products")), getDocs(collection(db, "Categories"))]);

   return [
      ...STATIC_PATHS.map((path) => ({ url: `${siteUrl}${path}`, changeFrequency: "weekly" as const, priority: path === "" ? 1 : 0.5 })),
      ...categoriesSnap.docs.map((category) => ({
         url: `${siteUrl}/list?cat=${encodeURIComponent(category.data().name)}`,
         changeFrequency: "weekly" as const,
         priority: 0.7,
      })),
      ...productsSnap.docs.map((product) => ({
         url: `${siteUrl}${productPath({ id: product.id, name: product.data().name })}`,
         lastModified: toDate(product.data().updated_at) ?? toDate(product.data().created_at),
         changeFrequency: "weekly" as const,
         priority: 0.8,
      })),
   ];
}
