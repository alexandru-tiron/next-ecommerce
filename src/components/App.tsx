"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebaseInit";
import { useTranslations } from "next-intl";
import { usePopupContext } from "@/context/PopupContext";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import { AuthNotice, clearUser, dismissNotice } from "@/state/auth/authSlice";
import { AuthError } from "@/state/auth/authError";
import syncUser, { stopUserSync } from "@/state/auth/actions/setUser";
import { setCart } from "@/state/cart/cartSlice";
import { stopCartSync, syncCart } from "@/state/cart/actions/syncCart";
import { readGuestCart } from "@/state/cart/guestCart";

// Keeps the Redux auth and cart state in sync with Firebase and shows the auth popups.
// Navbar and Footer stay in the root layout because Footer is a server component.
const App = ({ children }: { children: ReactNode }) => {
   const dispatch = useAppDispatch();
   const router = useRouter();
   const t = useTranslations("Popup");
   const { setPopup, setLoadPop } = usePopupContext();
   const uid = useAppSelector((state) => state.auth.user?.uid);
   const isAuthReady = useAppSelector((state) => state.auth.isAuthReady);
   const isLoading = useAppSelector((state) => state.auth.isLoading);
   const notice = useAppSelector((state) => state.auth.notice);

   useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
         if (user) {
            dispatch(syncUser(user));
         } else {
            stopUserSync();
            sessionStorage.removeItem("authUser");
            dispatch(clearUser());
         }
      });

      return () => {
         unsubscribe();
         stopUserSync();
      };
   }, [dispatch]);

   // Logged-in users get their Firestore cart (with any guest cart merged in), guests the localStorage one
   useEffect(() => {
      if (!isAuthReady) return;
      if (uid) {
         dispatch(syncCart(uid));
         return () => stopCartSync();
      }
      dispatch(setCart(readGuestCart()));
   }, [dispatch, isAuthReady, uid]);

   useEffect(() => {
      setLoadPop(isLoading);
   }, [isLoading, setLoadPop]);

   useEffect(() => {
      if (!notice) return;
      dispatch(dismissNotice());
      setPopup(getNoticePopup(notice, () => router.push("/"), t));
   }, [dispatch, notice, router, setPopup, t]);

   return <>{children}</>;
};

export default App;

type Translate = ReturnType<typeof useTranslations<"Popup">>;

function getNoticePopup(notice: AuthNotice, goHome: () => void, t: Translate) {
   switch (notice.type) {
      case "error":
         return {
            title: t("error"),
            variant: "error" as const,
            description: [<p key="error">{getAuthErrorMessage(notice.error, t)}</p>],
            buttons: [{ label: t("ok"), onClick: () => {}, className: "primary" }],
         };
      case "signedUp":
         return {
            title: t("signedUpTitle"),
            variant: "success" as const,
            description: [<p key="verify">{t("signedUpText", { email: notice.email })}</p>],
            buttons: [{ label: t("ok"), onClick: goHome, className: "primary" }],
         };
      case "passwordResetSent":
         return {
            title: t("passwordResetTitle"),
            variant: "success" as const,
            description: [<p key="success">{t("passwordResetText", { email: notice.email })}</p>],
            buttons: [{ label: t("ok"), onClick: goHome, className: "primary" }],
         };
      case "verificationSent":
         return {
            title: t("verificationSentTitle"),
            variant: "success" as const,
            description: [<p key="verify">{t("verificationSentText")}</p>],
            buttons: [{ label: t("ok"), onClick: () => {}, className: "primary" }],
         };
   }
}

// Firebase Auth error codes as messages for the visitor
function getAuthErrorMessage({ code }: AuthError, t: Translate) {
   switch (code) {
      case "auth/user-not-found":
         return t("authErrors.userNotFound");
      case "auth/internal-error":
         return t("authErrors.internal");
      case "auth/invalid-credential":
         return t("authErrors.invalidCredential");
      case "auth/invalid-email":
         return t("authErrors.invalidEmail");
      case "auth/wrong-password":
         return t("authErrors.wrongPassword");
      default:
         return t("authErrors.unknown");
   }
}
