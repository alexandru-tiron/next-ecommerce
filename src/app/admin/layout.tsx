"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Package, Tag, Users, Settings, Grid, Home, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { useTranslations } from "next-intl";
export default function AdminLayout({ children }: { children: React.ReactNode }) {
   const { user, admin, isAuthReady } = useAuthContext();
   const t = useTranslations("Admin");
   const router = useRouter();
   const pathname = usePathname();
   const [isLoading, setIsLoading] = useState(true);
   const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

   // Check for admin access directly
   useEffect(() => {
      // Don't do anything until auth is completely ready
      if (!isAuthReady) {
         // console.log("Auth not ready yet, waiting...");
         return;
      }
      // Auth is ready, now check admin status
      const checkAdmin = async () => {
         // Not logged in - redirect to login
         if (user === null) {
            // console.log("No user, redirecting to login");
            router.push("/login");
            return;
         } else if (user && !admin) {
            router.push("/");
            return;
         } else if (user && admin) {
            setIsLoading(false);
         }
      };

      checkAdmin();
   }, [user, router, isAuthReady, admin]);

   // Define sidebar navigation items
   const navItems = [
      { name: t("mainPanel"), href: "/admin", icon: <Grid className="w-5 h-5" /> },
      { name: t("products"), href: "/admin/products", icon: <Tag className="w-5 h-5" /> },
      { name: t("orders"), href: "/admin/orders", icon: <Package className="w-5 h-5" /> },
      { name: t("customers"), href: "/admin/customers", icon: <Users className="w-5 h-5" /> },
      //{ name: "Analize", href: "/admin/analytics", icon: <BarChart3 className="w-5 h-5" /> },
      { name: t("settings"), href: "/admin/settings", icon: <Settings className="w-5 h-5" /> },
   ];

   // Close mobile menu when route changes
   useEffect(() => {
      setMobileMenuOpen(false);
   }, [pathname]);

   // Show loading state if auth is not ready or we're checking admin status
   if (!isAuthReady || isLoading) {
      return (
         <div className="flex items-center justify-center min-h-screen">
            <div className="flex flex-col items-center">
               <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black mb-4"></div>
               <p className="text-gray-600">{!isAuthReady ? t("initAuth") : t("verifyAdminAccess")}</p>
            </div>
         </div>
      );
   }

   // Only render admin layout if user is admin
   if (!admin) {
      return (
         <div className="flex items-center justify-center min-h-screen">
            <div className="text-center p-8 max-w-md">
               <h1 className="text-2xl font-bold text-red-600 mb-4">{t("forbiddenAccess")}</h1>
               <p className="text-gray-700 mb-6">{t("noAdminPermission")}</p>
               <Link href="/" className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors">
                  {t("backToHome")}
               </Link>
            </div>
         </div>
      );
   }

   return (
      <div className="flex flex-col min-h-screen bg-gray-50">
         {/* Desktop Sidebar - visible only on large screens */}
         <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
            <div className="flex flex-col flex-grow pt-5 overflow-y-auto bg-white border-r border-gray-200">
               <div className="px-4 mb-6">
                  <Link href="/" className="flex items-center">
                     <span className="sr-only">{t("home")}</span>
                     <span className="text-xl font-bold text-gray-900">{t("adminPanel")}</span>
                  </Link>
               </div>

               <div className="flex flex-col flex-1 px-3 space-y-1">
                  {navItems.map((item) => {
                     const isActive = pathname === item.href;
                     return (
                        <Link key={item.name} href={item.href} className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive ? "bg-gray-100 text-black" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}>
                           {item.icon}
                           <span className="ml-3">{item.name}</span>
                        </Link>
                     );
                  })}

                  <div className="pt-4 mt-6 border-t border-gray-200">
                     <Link href="/" className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
                        <Home className="w-5 h-5" />
                        <span className="ml-3">{t("backToWebsite")}</span>
                     </Link>
                  </div>
               </div>
            </div>
         </div>

         {/* Mobile menu - visible for small and medium screens */}
         <div className={`fixed inset-0 z-40 ${mobileMenuOpen ? "flex" : "hidden"} lg:hidden`}>
            {/* Overlay */}
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setMobileMenuOpen(false)} aria-hidden="true"></div>

            {/* Mobile menu content */}
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
               <div className="absolute top-1 right-1  pt-2">
                  <button type="button" className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white" onClick={() => setMobileMenuOpen(false)}>
                     <span className="sr-only">{t("closeMenu")}</span>
                     <X className="h-6 w-6 " aria-hidden="true" />
                  </button>
               </div>

               <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
                  <div className="px-4 mb-6">
                     <Link href="/" className="flex items-center">
                        <span className="text-xl font-bold text-gray-900">{t("adminPanel")}</span>
                     </Link>
                  </div>
                  <nav className="px-2 space-y-1">
                     {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                        return (
                           <Link key={item.name} href={item.href} className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${isActive ? "bg-gray-100 text-black" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}>
                              {item.icon}
                              <span className="ml-3">{item.name}</span>
                           </Link>
                        );
                     })}
                  </nav>
               </div>

               <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
                  <Link href="/" className="flex items-center px-3 py-2 text-base font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900">
                     <Home className="w-5 h-5" />
                     <span className="ml-3">{t("backToWebsite")}</span>
                  </Link>
               </div>
            </div>

            <div className="flex-shrink-0 w-14" aria-hidden="true">
               {/* Dummy element to force sidebar to shrink to fit close icon */}
            </div>
         </div>

         {/* Content area for mobile and desktop */}
         <div className="flex flex-col w-full flex-1">
            {/* Header - visible on small and medium screens */}
            <div className="sticky top-0 z-10 flex-shrink-0 h-14 bg-white border-b border-gray-200 w-full lg:hidden">
               <div className="flex items-center justify-between w-full px-4 h-full">
                  {/* Mobile menu button */}
                  <button type="button" className="inline-flex items-center justify-center w-9 h-9 text-gray-500 rounded-md hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-400" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                     <span className="sr-only">{mobileMenuOpen ? t("closeMenu") : t("openMenu")}</span>
                     <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                     </svg>
                  </button>

                  {/* Title */}
                  <Link href="/admin" className="text-lg font-semibold text-gray-900">
                     {t("adminPanel")}
                  </Link>

                  {/* Empty div for spacing */}
                  <div className="w-9"></div>
               </div>
            </div>

            {/* Main content */}
            <main className="flex-1 px-3 py-6 sm:px-4 md:px-8 md:py-8 lg:px-16 lg:py-10 overflow-auto bg-gray-50 w-full lg:pl-80">{children}</main>
         </div>
      </div>
   );
}
