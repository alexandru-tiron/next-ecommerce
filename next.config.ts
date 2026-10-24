import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();
const storageBucket = process.env.NEXT_PUBLIC_STORAGEBUCKET;
const svgrOptions = {
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
};
// Sent with every response. The Content-Security-Policy is added per request in src/middleware.ts, because it carries a nonce.
const securityHeaders = [
   // Browsers only use HTTPS for this site for two years (add "; preload" once the domain is ready for the HSTS preload list)
   { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
   { key: "X-Content-Type-Options", value: "nosniff" },
   { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
   // Older browsers' version of the CSP's frame-ancestors 'none'
   { key: "X-Frame-Options", value: "DENY" },
   { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
   // Other sites' windows can't script this one; the Google sign-in popup still works
   { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];
const nextConfig: NextConfig = {
   /* config options here */
   poweredByHeader: false,
   // `next dev --turbopack` ignores the webpack() config below, so it needs its own rule to import *.svg as React components
   turbopack: {
      rules: {
         "*.svg": {
            loaders: [{ loader: "@svgr/webpack", options: svgrOptions }],
            as: "*.js",
         },
      },
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
               options: svgrOptions,
            },
         }
      );

      // Modify the file loader rule to ignore *.svg, since we have it handled now.
      fileLoaderRule.exclude = /\.svg$/i;

      return config;
   },
   images: {
      // Category icons are SVGs in Firebase Storage. Serve them as sandboxed attachments so an SVG can't run scripts.
      dangerouslyAllowSVG: true,
      contentDispositionType: "attachment",
      contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
      unoptimized: false, // Enables Next.js image optimization
      formats: ["image/avif", "image/webp"],
      // Uploads get a new file name, so an optimized image can be cached for a long time
      minimumCacheTTL: 60 * 60 * 24 * 30,
      remotePatterns: [
         {
            // Only images from this project's Storage bucket, so the optimizer can't be used as an open proxy
            protocol: "https",
            hostname: "firebasestorage.googleapis.com",
            pathname: storageBucket ? `/v0/b/${storageBucket}/o/**` : "/v0/b/**",
         },
      ],
      disableStaticImages: false,
   },
   transpilePackages: ["react-responsive-carousel", "tailwindcss"],
   async headers() {
      return [
         { source: "/:path*", headers: securityHeaders },
         {
            // The service worker must always be re-fetched so updates reach visitors
            source: "/sw.js",
            headers: [
               { key: "Content-Type", value: "application/javascript; charset=utf-8" },
               { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
               { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
            ],
         },
      ];
   },
};

export default withNextIntl(nextConfig);
