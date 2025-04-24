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
   webpack(config) {
      // Grab the existing rule that handles SVG imports
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fileLoaderRule = config.module.rules.find((rule: any) => rule.test?.test?.(".svg"));

      if (!fileLoaderRule) return config;

      config.module.rules.push(
         // Reapply the existing rule, but only for svg imports ending in ?url
         {
            ...fileLoaderRule,
            test: /\.svg$/i,
            resourceQuery: /url/, // *.svg?url
         },
         // Convert all other *.svg imports to React components
         {
            test: /\.svg$/i,
            issuer: fileLoaderRule.issuer,
            resourceQuery: { not: [...(fileLoaderRule.resourceQuery?.not || []), /url/] }, // exclude if *.svg?url
            use: {
               loader: "@svgr/webpack",
               options: {
                  svgoConfig: {
                     plugins: [
                        {
                           name: "preset-default",
                           params: {
                              overrides: {
                                 removeViewBox: false,
                              },
                           },
                        },
                     ],
                  },
               },
            },
         }
      );

      // Modify the file loader rule to ignore *.svg, since we have it handled now.
      fileLoaderRule.exclude = /\.svg$/i;

      return config;
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
   transpilePackages: ["react-responsive-carousel", "tailwindcss"],

};

export default withNextIntl(nextConfig);
