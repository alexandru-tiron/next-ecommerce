"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebaseInit";
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
      setPopup(getNoticePopup(notice, () => router.push("/")));
   }, [dispatch, notice, router, setPopup]);

   return <>{children}</>;
};

export default App;

function getNoticePopup(notice: AuthNotice, goHome: () => void) {
   switch (notice.type) {
      case "error":
         return {
            title: "Eroare",
            description: [<p key="error">{getAuthErrorMessage(notice.error)}</p>],
            buttons: [{ label: "OK", onClick: () => {}, className: "primary" }],
         };
      case "signedUp":
         return {
            title: "Cont creat cu succes",
            description: [<p key="verify">Un email de verificare a fost trimis la adresa {notice.email}. Vă rugăm să verificați căsuța de email și să urmați instrucțiunile pentru a vă activa contul.</p>],
            buttons: [{ label: "OK", onClick: goHome, className: "primary" }],
         };
      case "passwordResetSent":
         return {
            title: "Succes",
            description: [<p key="success">Un email pentru resetare a parolei a fost trimis la adresa {notice.email}.</p>],
            buttons: [{ label: "OK", onClick: goHome, className: "primary" }],
         };
      case "verificationSent":
         return {
            title: "Email trimis",
            description: [<p key="verify">Un nou email de verificare a fost trimis. Vă rugăm să verificați căsuța de email și să urmați instrucțiunile pentru a vă activa contul.</p>],
            buttons: [{ label: "OK", onClick: () => {}, className: "primary" }],
         };
   }
}

// Map error codes to user-friendly messages
function getAuthErrorMessage({ code, message }: AuthError) {
   switch (code) {
      case "auth/user-not-found":
         return "Utilizatorul nu a fost găsit";
      case "auth/internal-error":
         return "Eroare internă";
      case "auth/invalid-credential":
         return "Credențiale invalide";
      case "auth/invalid-email":
         return "Email invalid";
      case "auth/wrong-password":
         return "Parola greșită";
      default:
         return message;
   }
}
