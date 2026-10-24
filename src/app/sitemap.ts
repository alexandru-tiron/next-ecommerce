import type { MetadataRoute } from "next";
import { getSitemapData } from "@/lib/server/storeData";
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
   const { products, categories } = await getSitemapData();

   return [
      ...STATIC_PATHS.map((path) => ({ url: `${siteUrl}${path}`, changeFrequency: "weekly" as const, priority: path === "" ? 1 : 0.5 })),
      ...categories.map((name) => ({
         url: `${siteUrl}/list?cat=${encodeURIComponent(name)}`,
         changeFrequency: "weekly" as const,
         priority: 0.7,
      })),
      ...products.map((product) => ({
         url: `${siteUrl}${productPath(product)}`,
         lastModified: product.lastModified ? new Date(product.lastModified) : undefined,
         changeFrequency: "weekly" as const,
         priority: 0.8,
      })),
   ];
}
