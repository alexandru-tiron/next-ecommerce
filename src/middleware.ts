import { NextResponse, type NextRequest } from "next/server";
import { buildContentSecurityPolicy } from "@/lib/csp";

// Gives every page request a fresh nonce. Next.js reads it from the request's CSP header and adds it to its own
// scripts, so the browser runs those and blocks any script injected into the page.
export function middleware(request: NextRequest) {
   const nonce = btoa(crypto.randomUUID());
   const csp = buildContentSecurityPolicy({
      nonce,
      isDev: process.env.NODE_ENV === "development",
      authDomain: process.env.NEXT_PUBLIC_AUTHDOMAIN,
   });

   const requestHeaders = new Headers(request.headers);
   // Server components can read the nonce from this header for any <Script> they add
   requestHeaders.set("x-nonce", nonce);
   requestHeaders.set("Content-Security-Policy", csp);
   // Server components that render differently on some pages (the footer on admin pages) read the path from here
   requestHeaders.set("x-pathname", request.nextUrl.pathname);

   const response = NextResponse.next({ request: { headers: requestHeaders } });
   response.headers.set("Content-Security-Policy", csp);
   return response;
}

export const config = {
   matcher: [
      {
         // Pages only. Build assets, images, the image optimizer (it sets its own CSP) and the service worker are skipped.
         source: "/((?!_next/static|_next/image|favicon.ico|sw.js|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico)$).*)",
         // Prefetches only fetch data, so they don't need a nonce
         missing: [
            { type: "header", key: "next-router-prefetch" },
            { type: "header", key: "purpose", value: "prefetch" },
         ],
      },
   ],
};
