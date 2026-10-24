import type { MetadataRoute } from "next";
import { storeName } from "@/lib/siteUrl";

export default function manifest(): MetadataRoute.Manifest {
   return {
      name: storeName,
      short_name: storeName,
      description: "E-commerce store",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#ffffff",
      icons: [
         { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
         { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
         { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
   };
}
