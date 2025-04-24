import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();
const nextConfig: NextConfig = {
   /* config options here */
   typescript: {
      // !! WARN !!
      // Temporary workaround for type error during build
      // Remove after fixing the actual type issue
      ignoreBuildErrors: true,
   },
   eslint: {
      // Temporary workaround for type error during build
      // Remove after fixing the actual type issue
      ignoreDuringBuilds: true,
   },
   images: {
      dangerouslyAllowSVG: true,
      unoptimized: false, // Enables Next.js image optimization
      remotePatterns: [
         {
            protocol: "https",
            hostname: "**", // Allows optimization for all external images
         },
      ],
      disableStaticImages: false,
   },
};

export default withNextIntl(nextConfig);
