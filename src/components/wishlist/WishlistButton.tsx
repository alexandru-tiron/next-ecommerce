"use client";

import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { twMerge } from "tailwind-merge";
import { useWishlist } from "./wishlistStore";

const WishlistButton = ({ productId, className, size = 20 }: { productId: string; className?: string; size?: number }) => {
   const t = useTranslations("Wishlist");
   const { has, toggle } = useWishlist();
   const active = has(productId);
   const label = active ? t("remove") : t("add");

   return (
      <button
         type="button"
         // The button can sit inside a product card link, so don't follow the link
         onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            toggle(productId).catch((error) => console.error("Error updating the wishlist:", error));
         }}
         aria-pressed={active}
         aria-label={label}
         title={label}
         className={twMerge("rounded-full bg-white/90 p-2 shadow-sm transition-transform hover:scale-110", className)}
      >
         <Heart size={size} className={active ? "fill-pink-600 text-pink-600" : "text-gray-600"} />
      </button>
   );
};

export default WishlistButton;
