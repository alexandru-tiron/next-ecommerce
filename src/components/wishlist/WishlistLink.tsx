"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useWishlist } from "./wishlistStore";

// Navbar heart with the number of saved products
const WishlistLink = () => {
   const t = useTranslations("Wishlist");
   const { ids } = useWishlist();

   return (
      <Link href="/wishlist" className="relative" aria-label={t("title")} title={t("title")}>
         <Heart size={22} />
         {ids.length > 0 && <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 bg-pink-600 rounded-full text-white text-xs flex items-center justify-center">{ids.length}</span>}
      </Link>
   );
};

export default WishlistLink;
