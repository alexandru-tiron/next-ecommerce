"use client";

// import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import CartModal from "./CartModal";
import { useAuthContext } from "@/context/AuthContext";
import { useCartContext } from "@/context/CartContext";
import { User, LogOut, Package, MapPin, Search, UserRound, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
const NavIcons = ({ isSearchOpen, setIsSearchOpen }: { isSearchOpen: boolean; setIsSearchOpen: (isSearchOpen: boolean) => void }) => {
   const t = useTranslations("Navbar");
   const [isProfileOpen, setIsProfileOpen] = useState(false);
   const [isCartOpen, setIsCartOpen] = useState(false);
   const [isLoading, setIsLoading] = useState(false);

   const router = useRouter();
   const { user, handleLogout } = useAuthContext();
   const { counter, clearLocalCart } = useCartContext();
   const cartRef = useRef<HTMLDivElement>(null);
   const profileRef = useRef<HTMLDivElement>(null);

   const handleProfile = () => {
      if (!user) {
         router.push("/login");
      } else {
         setIsProfileOpen((prev) => !prev);
         setIsSearchOpen(false);
      }
   };

   const logout = async () => {
      setIsLoading(true);
      handleLogout();
      clearLocalCart();
      setIsLoading(false);
      setIsProfileOpen(false);
   };

   const navigateToProfile = (tab?: string) => {
      setIsProfileOpen(false);
      if (tab) {
         router.push(`/profile?tab=${tab}`);
      } else {
         router.push("/profile");
      }
   };

   useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
         if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
            setIsProfileOpen(false);
         }
      }

      if (isProfileOpen) {
         document.addEventListener("mousedown", handleClickOutside);
      } else {
         document.removeEventListener("mousedown", handleClickOutside);
      }

      return () => {
         document.removeEventListener("mousedown", handleClickOutside);
      };
   }, [isProfileOpen]);

   useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
         if (cartRef.current && !cartRef.current.contains(event.target as Node)) {
            setIsCartOpen(false);
         }
      }

      if (isCartOpen) {
         document.addEventListener("mousedown", handleClickOutside);
      } else {
         document.removeEventListener("mousedown", handleClickOutside);
      }

      return () => {
         document.removeEventListener("mousedown", handleClickOutside);
      };
   }, [isCartOpen]);

   return (
      <div className="flex items-center gap-4 xl:gap-5 relative">
         <div className="relative cursor-pointer">
            <Search className="cursor-pointer size-6" onClick={() => setIsSearchOpen(!isSearchOpen)} />
         </div>
         <div className="relative">
            <UserRound className="cursor-pointer size-6" onClick={handleProfile} />
            {isProfileOpen && (
               <div ref={profileRef} className="absolute p-4 rounded-md top-12 right-0 bg-white text-sm shadow-[0_3px_10px_rgb(0,0,0,0.2)] z-20 w-64 divide-y divide-gray-100" style={{ maxWidth: "calc(100vw - 2rem)" }}>
                  {user && user.db && (
                     <div className="pb-3">
                        <div className="font-medium text-base mb-1">
                           {user.db.first_name} {user.db.last_name}
                        </div>
                        <div className="text-gray-500 text-sm truncate">{user.db.email}</div>
                     </div>
                  )}

                  <div className="py-2">
                     <button onClick={() => navigateToProfile("personal")} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-md transition-colors w-full text-left">
                        <User size={16} className="text-gray-600" />
                        <span>{t("myProfile")}</span>
                     </button>

                     <button onClick={() => navigateToProfile("orders")} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-md transition-colors w-full text-left">
                        <Package size={16} className="text-gray-600" />
                        <span>{t("myOrders")}</span>
                     </button>

                     <button onClick={() => navigateToProfile("addresses")} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-md transition-colors w-full text-left">
                        <MapPin size={16} className="text-gray-600" />
                        <span>{t("myAddresses")}</span>
                     </button>
                  </div>

                  <div className="pt-2">
                     <button onClick={logout} disabled={isLoading} className="flex items-center gap-2 p-2 text-red-600 hover:bg-gray-50 rounded-md transition-colors w-full text-left">
                        <LogOut size={16} />
                        <span>{isLoading ? t("loggingOut") : t("logout")}</span>
                     </button>
                  </div>
               </div>
            )}
         </div>

         <div
            className="relative cursor-pointer"
            onClick={() => {
               setIsCartOpen((prev) => !prev);
               setIsSearchOpen(false);
            }}
         >
            <ShoppingCart className="size-6" />
            {counter != 0 && <div className="absolute -top-3 -right-3 w-5 h-5 bg-pink-700 rounded-full text-white text-xs flex items-center justify-center">{counter}</div>}
         </div>
         {isCartOpen && <CartModal ref={cartRef} setIsCartOpen={setIsCartOpen} />}
      </div>
   );
};

export default NavIcons;
