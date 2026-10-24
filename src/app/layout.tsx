import { PopUpProvider } from "../context/PopupContext";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
// import { getMessages } from 'next-intl/server';
import { Inter, Calistoga } from "next/font/google";
import { twMerge } from "tailwind-merge";
import { Metadata, Viewport } from "next";
import { siteUrl, storeName } from "@/lib/siteUrl";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/footer/Footer";
import StoreProvider from "@/state/StoreProvider";
import App from "@/components/App";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const calistoga = Calistoga({ subsets: ["latin"], variable: "--font-serif", weight: ["400"] });

export const metadata: Metadata = {
   metadataBase: new URL(siteUrl),
   title: {
      default: storeName,
      template: `%s | ${storeName}`,
   },
   description: "E-commerce store",
   openGraph: {
      type: "website",
      siteName: storeName,
   },
   appleWebApp: {
      capable: true,
      title: storeName,
      statusBarStyle: "default",
   },
   icons: {
      apple: "/icons/apple-touch-icon.png",
   },
};

export const viewport: Viewport = {
   themeColor: "#ffffff",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
   const locale = await getLocale();
   // const messages = await getMessages();
   return (
      <html lang={locale} suppressHydrationWarning>
         <body className={twMerge(inter.variable, calistoga.variable, "antialiased")}>
            <NextIntlClientProvider locale={locale}>
               {/* messages={messages}> */}
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
            </NextIntlClientProvider>
            <ServiceWorkerRegister />
         </body>
      </html>
   );
}
