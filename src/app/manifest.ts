import type { MetadataRoute } from "next";
import { brandPalette } from "@core/brand";
import { getBranding, getInfoData } from "@/lib/server/storeData";

// Rebuilt at most hourly, so a new store name or brand colour reaches installed apps
export const revalidate = 3600;

export default async function manifest(): Promise<MetadataRoute.Manifest> {
   const [info, branding] = await Promise.all([getInfoData(), getBranding()]);
   return {
      name: info.store_name,
      short_name: info.store_name,
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: brandPalette(branding.brand_color)[700],
      icons: [
         { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
         { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
         { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
   };
}
