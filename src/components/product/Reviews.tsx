"use client";

import { Review } from "@/types/product";
import { format } from "date-fns";
import { BadgeCheck, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { twMerge } from "tailwind-merge";
import ReviewForm from "./ReviewForm";

export const Stars = ({ value, size = 16 }: { value: number; size?: number }) => (
   <div className="flex gap-0.5" aria-label={`${value} / 5`}>
      {Array.from({ length: 5 }).map((_, index) => (
         <Star key={index} size={size} className={twMerge("text-amber-400", index < Math.round(value) ? "fill-amber-400" : "fill-transparent")} />
      ))}
   </div>
);

export const Reviews = ({ productId, reviews }: { productId: string; reviews: Review[] }) => {
   const t = useTranslations("ProductPage");
   const average = reviews.length > 0 ? reviews.reduce((acc, cur) => acc + cur.stars, 0) / reviews.length : 0;

   return (
      <div className="flex flex-col gap-6">
         {reviews.length > 0 ? (
            <div className="flex flex-col sm:flex-row gap-6 sm:items-center">
               <div className="flex flex-col items-start gap-1">
                  <span className="text-4xl font-medium">{average.toFixed(1)}</span>
                  <Stars value={average} size={18} />
                  <span className="text-sm text-gray-500">{t("basedOnReviews", { count: reviews.length })}</span>
               </div>
               <div className="flex-1 flex flex-col gap-1">
                  {[5, 4, 3, 2, 1].map((stars) => {
                     const count = reviews.filter((review) => review.stars === stars).length;
                     return (
                        <div key={stars} className="flex items-center gap-2 text-sm">
                           <span className="w-3 text-gray-600">{stars}</span>
                           <Star size={12} className="text-amber-400 fill-amber-400" />
                           <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-400" style={{ width: `${(count / reviews.length) * 100}%` }} />
                           </div>
                           <span className="w-6 text-right text-gray-500">{count}</span>
                        </div>
                     );
                  })}
               </div>
            </div>
         ) : (
            <p className="text-gray-500">{t("noReviewsYet")}</p>
         )}

         <ReviewForm productId={productId} reviews={reviews} />

         {reviews.map((review: Review) => (
            <div className="flex flex-col gap-2 border-b border-gray-100 pb-4" key={review.id}>
               <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-medium">{review.username}</span>
                  {review.verified && (
                     <span className="flex items-center gap-1 text-xs text-green-700">
                        <BadgeCheck size={14} />
                        {t("verifiedPurchase")}
                     </span>
                  )}
                  {review.date && <span className="text-xs text-gray-500 ml-auto">{format(new Date(review.date), "d MMM yyyy")}</span>}
               </div>
               <Stars value={review.stars} />
               {review.review && <p className="text-gray-700">{review.review}</p>}
            </div>
         ))}
      </div>
   );
};
