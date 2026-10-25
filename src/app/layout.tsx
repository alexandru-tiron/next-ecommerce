import { PopUpProvider } from "../context/PopupContext";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { Calistoga, Inter, Lora, Poppins } from "next/font/google";
import { twMerge } from "tailwind-merge";
import { Metadata, Viewport } from "next";
import { siteUrl } from "@/lib/siteUrl";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/footer/Footer";
import StoreProvider from "@/state/StoreProvider";
import App from "@/components/App";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import AnalyticsConsent from "@/components/AnalyticsConsent";
import { StoreSettingsProvider } from "@/components/StoreSettingsProvider";
import { getAnalytics, getBranding, getInfoData, getLocalization } from "@/lib/server/storeData";
import { brandingCss } from "@/lib/branding";

// The fonts owners can pick in Settings → Branding. Only Inter is preloaded; the others load when chosen.
const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter" });
const poppins = Poppins({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"], variable: "--font-poppins", preload: false });
const lora = Lora({ subsets: ["latin", "latin-ext"], variable: "--font-lora", preload: false });
const calistoga = Calistoga({ subsets: ["latin"], variable: "--font-serif", weight: ["400"] });

export async function generateMetadata(): Promise<Metadata> {
   const [info, branding] = await Promise.all([getInfoData(), getBranding()]);
   const name = info.store_name;
   return {
      metadataBase: new URL(siteUrl),
      title: {
         default: name,
         template: `%s | ${name}`,
      },
      openGraph: {
         type: "website",
         siteName: name,
         ...(branding.share_image_url ? { images: [branding.share_image_url] } : {}),
      },
      twitter: { card: branding.share_image_url ? "summary_large_image" : "summary" },
      appleWebApp: {
         capable: true,
         title: name,
         statusBarStyle: "default",
      },
      icons: {
         ...(branding.favicon_url ? { icon: branding.favicon_url } : {}),
         apple: "/icons/apple-touch-icon.png",
      },
   };
}

export const viewport: Viewport = {
   themeColor: "#ffffff",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
   const [locale, info, branding, localization, analytics] = await Promise.all([getLocale(), getInfoData(), getBranding(), getLocalization(), getAnalytics()]);
   return (
      <html lang={locale} className={twMerge(inter.variable, poppins.variable, lora.variable, calistoga.variable)} suppressHydrationWarning>
         <head>
            {/* Brand colours, corners and font from Settings → Branding, set before the page paints */}
            <style dangerouslySetInnerHTML={{ __html: brandingCss(branding) }} />
         </head>
         <body className="font-sans antialiased">
            <NextIntlClientProvider locale={locale}>
               <StoreSettingsProvider value={{ storeName: info.store_name, logoUrl: branding.logo_url, localization, analytics }}>
                  <StoreProvider>
                     <PopUpProvider>
                        <App>
                           <div className="flex flex-col min-h-screen">
                              <Navbar />
                              <main className="flex-grow ">{children}</main>
                              <Footer />
                           </div>
                        </App>
                     </PopUpProvider>
                  </StoreProvider>
                  <AnalyticsConsent />
               </StoreSettingsProvider>
            </NextIntlClientProvider>
            <ServiceWorkerRegister />
         </body>
      </html>
   );
}
