"use client";

import { auth, db } from "@/lib/firebaseInit";
import { Review } from "@/types/product";
import { onAuthStateChanged, User } from "firebase/auth";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import { reviewerName } from "./reviewerName";

// Matches the limit in firestore.rules
export const REVIEW_MAX_LENGTH = 1000;

// Reads the signed-in user straight from Firebase Auth, so it works the same with the auth context or the Redux store
function useFirebaseUser() {
   const [user, setUser] = useState<User | null | undefined>(undefined);
   useEffect(() => onAuthStateChanged(auth, setUser), []);
   return user;
}

const ReviewForm = ({ productId, reviews }: { productId: string; reviews: Review[] }) => {
   const t = useTranslations("ProductPage");
   const router = useRouter();
   const user = useFirebaseUser();
   const ownReview = user ? reviews.find((review) => review.uid === user.uid) : undefined;
   const [stars, setStars] = useState(0);
   const [hovered, setHovered] = useState(0);
   const [text, setText] = useState("");
   const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

   useEffect(() => {
      setStars(ownReview?.stars ?? 0);
      setText(ownReview?.review ?? "");
   }, [ownReview?.stars, ownReview?.review]);

   if (user === undefined) return null;
   if (user === null) {
      return (
         <p className="text-sm text-gray-600">
            <Link href="/login" className="text-brand-700 hover:underline">
               {t("signInToReview")}
            </Link>
         </p>
      );
   }

   const submit = async (event: FormEvent) => {
      event.preventDefault();
      if (stars < 1) return;
      setStatus("saving");
      try {
         const profile = await getDoc(doc(db, "Users", user.uid));
         const username = reviewerName(profile.data()?.first_name, profile.data()?.last_name, user.displayName, user.email);
         // The review id is the user's id, so each customer has one review per product (enforced by the Firestore rules)
         await setDoc(doc(db, "Products", productId, "Reviews", user.uid), { uid: user.uid, username, stars, review: text.trim(), date: serverTimestamp() });
         setStatus("saved");
         router.refresh();
      } catch (error) {
         console.error("Error saving review:", error);
         setStatus("error");
      }
   };

   const remove = async () => {
      setStatus("saving");
      try {
         await deleteDoc(doc(db, "Products", productId, "Reviews", user.uid));
         setStatus("idle");
         router.refresh();
      } catch (error) {
         console.error("Error deleting review:", error);
         setStatus("error");
      }
   };

   return (
      <form onSubmit={submit} className="flex flex-col gap-3 bg-gray-50 rounded-lg p-4">
         <h2 className="font-medium">{ownReview ? t("yourReviewTitle") : t("writeReview")}</h2>
         <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{t("yourRating")}</span>
            <div className="flex" onMouseLeave={() => setHovered(0)}>
               {[1, 2, 3, 4, 5].map((value) => (
                  <button type="button" key={value} onClick={() => setStars(value)} onMouseEnter={() => setHovered(value)} aria-label={`${value} / 5`} className="p-0.5">
                     <Star size={24} className={twMerge("text-amber-400 transition-colors", value <= (hovered || stars) ? "fill-amber-400" : "fill-transparent")} />
                  </button>
               ))}
            </div>
         </div>
         <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={REVIEW_MAX_LENGTH}
            rows={3}
            placeholder={t("reviewPlaceholder")}
            className="w-full rounded-md border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200"
         />
         <div className="flex items-center gap-3 flex-wrap">
            <button type="submit" disabled={stars < 1 || status === "saving"} className="rounded-md bg-black text-white py-2 px-4 text-sm disabled:opacity-40">
               {ownReview ? t("updateReview") : t("submitReview")}
            </button>
            {ownReview && (
               <button type="button" onClick={remove} disabled={status === "saving"} className="text-sm text-gray-600 hover:text-red-600">
                  {t("deleteReview")}
               </button>
            )}
            {stars < 1 && <span className="text-xs text-gray-500">{t("ratingRequired")}</span>}
            {status === "saved" && <span className="text-sm text-green-700">{t("reviewSaved")}</span>}
            {status === "error" && <span className="text-sm text-red-600">{t("reviewError")}</span>}
         </div>
      </form>
   );
};

export default ReviewForm;
