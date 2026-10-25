// Public base URL of the store, used for canonical links, Open Graph tags, the sitemap and robots.txt
export const siteUrl = (
   process.env.NEXT_PUBLIC_SITE_URL ||
   (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/$/, "");
