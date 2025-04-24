import { AuthProvider } from "../context/AuthContext";
import { CartProvider } from "../context/CartContext";
import LayoutWrapper from "../components/navigation/LayoutWrapper";

import { PopUpProvider } from "../context/PopupContext";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
// import { getMessages } from 'next-intl/server';
import { Inter, Calistoga } from "next/font/google";
import { twMerge } from "tailwind-merge";
import { Metadata } from "next";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/footer/Footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const calistoga = Calistoga({ subsets: ["latin"], variable: "--font-serif", weight: ["400"] });

export const metadata: Metadata = {
   title: process.env.NEXT_PUBLIC_STORE_NAME || "Shop",
   description: "E-commerce store",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
   const locale = await getLocale();
   // const messages = await getMessages();
   return (
      <html lang={locale} suppressHydrationWarning>
         <body className={twMerge(inter.variable, calistoga.variable, "antialiased")}>
            <NextIntlClientProvider locale={locale}>
               {/* messages={messages}> */}
               <PopUpProvider>
                  <AuthProvider>
                     <CartProvider>
                        <div className="flex flex-col min-h-screen">
                           <Navbar />
                           <main className="flex-grow ">{children}</main>
                           <Footer />
                        </div>
                     </CartProvider>
                  </AuthProvider>
               </PopUpProvider>
            </NextIntlClientProvider>
         </body>
      </html>
   );
}
