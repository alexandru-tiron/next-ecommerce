import { getLocale, getTranslations } from "next-intl/server";
import { getInfoData } from "@/lib/server/storeData";

// Offline fallback cached by the service worker (public/sw.js).
// It is plain HTML with no client JavaScript, because the app's JS chunks may not be cached when the visitor goes offline.
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] as string);

export async function GET() {
   const locale = await getLocale();
   const t = await getTranslations({ locale, namespace: "Offline" });
   const { store_name } = await getInfoData();
   const [title, description, retry, store] = [t("title"), t("description"), t("retry"), store_name].map(escapeHtml);

   const html = `<!doctype html>
<html lang="${escapeHtml(locale)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#ffffff">
<title>${title} | ${store}</title>
<style>
body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #ffffff; color: #111827; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; text-align: center; }
main { padding: 16px; max-width: 28rem; display: flex; flex-direction: column; align-items: center; gap: 16px; }
img { width: 64px; height: 64px; }
h1 { margin: 0; font-size: 1.5rem; font-weight: 500; }
p { margin: 0; color: #4b5563; }
a { background: #000000; color: #ffffff; text-decoration: none; padding: 12px 16px; border-radius: 6px; }
</style>
</head>
<body>
<main>
<img src="/images/logo.svg" alt="${store}">
<h1>${title}</h1>
<p>${description}</p>
<a href="/">${retry}</a>
</main>
</body>
</html>`;

   return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
