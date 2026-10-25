"use client";
import Link from "next/link";
import Image from "next/image";
import WishlistLink from "@/components/wishlist/WishlistLink";
import SearchBar from "./SearchBar";
import NavIcons from "./NavIcons";
import Menu from "./Menu";
import { twMerge } from "tailwind-merge";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useStoreSettings } from "@/components/StoreSettingsProvider";
import LanguageSwitcher from "./LanguageSwitcher";
const Navbar = () => {
   const pathname = usePathname();
   const [isScrolled, setIsScrolled] = useState(false);
   const [isSearchOpen, setIsSearchOpen] = useState(false);
   const { storeName, logoUrl } = useStoreSettings();
   useEffect(() => {
      const handleScroll = () => {
         setIsScrolled(window.scrollY > 64);
      };

      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
   }, []);
   const isAdminRoute = pathname?.startsWith("/admin");
   if (isAdminRoute) return null;
   return (
      <nav className={twMerge("h-16 bg-white px-6 md:px-8 lg:px-16 xl:px-32 2xl:px-64 sticky top-0 left-0 z-40 lg:z-[100] shadow-sm shadow-slate-200", isScrolled && "shadow-md")}>
         {/* BIGGER SCREENS */}
         <div className="flex items-center justify-between gap-8 h-full">
            {/* LEFT */}
            <div className=" flex items-center  justify-between gap-4">
               <Menu />
               <Link href="/" className="flex items-center gap-3 min-h-7 min-w-7">
                  <Image src={logoUrl || "/images/logo.svg"} alt="" className="h-7 w-auto max-w-32 object-contain" width={112} height={28} />
                  <div className="text-base font-semibold lg:text-xl tracking-wide hidden sm:block">{storeName}</div>
               </Link>
            </div>
            {/* RIGHT */}
            {isSearchOpen && (
               <div className="absolute top-16 h-16 left-0 w-full z-30 bg-white flex justify-center items-center shadow-sm shadow-slate-200 md:relative md:top-0 md:left-0  md:max-w-xl md:shadow-none">
                  <SearchBar setIsSearchOpen={setIsSearchOpen} className=" md:flex" />
               </div>
            )}
            <div className="flex items-center justify-between gap-6">
               <LanguageSwitcher className="hidden md:flex" />
               <WishlistLink />
               <NavIcons isSearchOpen={isSearchOpen} setIsSearchOpen={setIsSearchOpen} />
            </div>
         </div>
      </nav>
   );
};

export default Navbar;
