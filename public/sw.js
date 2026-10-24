// Service worker: shows an offline page when there is no connection and caches the hashed build assets.
// Pages themselves are never cached, because they show live prices, stock and the visitor's own cart.
// Bump VERSION whenever the offline page or the precached files change, so browsers install the new copy
const VERSION = "v2";
const STATIC_CACHE = `static-${VERSION}`;
const OFFLINE_CACHE = `offline-${VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/images/logo.svg"];

self.addEventListener("install", (event) => {
   event.waitUntil(
      caches
         .open(OFFLINE_CACHE)
         .then((cache) => cache.addAll(PRECACHE))
         .then(() => self.skipWaiting())
   );
});

self.addEventListener("activate", (event) => {
   // Drop caches left by older versions of this file
   event.waitUntil(
      caches
         .keys()
         .then((keys) => Promise.all(keys.filter((key) => key !== STATIC_CACHE && key !== OFFLINE_CACHE).map((key) => caches.delete(key))))
         .then(() => self.clients.claim())
   );
});

self.addEventListener("fetch", (event) => {
   const { request } = event;
   if (request.method !== "GET") return;
   const url = new URL(request.url);
   // Firestore, Storage and Algolia requests go straight to the network
   if (url.origin !== self.location.origin) return;

   if (request.mode === "navigate") {
      event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL).then((cached) => cached || Response.error())));
      return;
   }

   // Build assets have a content hash in their name, so a cached copy never goes stale
   if (url.pathname.startsWith("/_next/static/")) {
      event.respondWith(
         caches.match(request).then(
            (cached) =>
               cached ||
               fetch(request).then((response) => {
                  if (response.ok) {
                     const copy = response.clone();
                     caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
                  }
                  return response;
               })
         )
      );
   }
});
