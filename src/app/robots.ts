import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
   return {
      rules: {
         userAgent: "*",
         allow: "/",
         // Account, checkout and admin pages have nothing for search engines
         disallow: ["/admin", "/profile", "/checkout", "/cart", "/login", "/offline", "/wishlist"],
      },
      sitemap: `${siteUrl}/sitemap.xml`,
   };
}
