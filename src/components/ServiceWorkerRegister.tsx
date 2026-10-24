"use client";

import { useEffect } from "react";

// Registers public/sw.js, which adds the offline page and asset caching that make the store installable as a PWA
export default function ServiceWorkerRegister() {
   useEffect(() => {
      if (!("serviceWorker" in navigator)) return;
      if (process.env.NODE_ENV !== "production") {
         // A worker left by a production build on the same origin would serve stale dev assets, so remove it
         navigator.serviceWorker.getRegistrations().then((registrations) => registrations.forEach((registration) => registration.unregister()));
         return;
      }
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((error) => console.error("Service worker registration failed:", error));
   }, []);

   return null;
}
