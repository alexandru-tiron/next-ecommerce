"use client";

import { ReactNode, useEffect } from "react";
import { clearUser } from "@/state/auth/authSlice";
import { auth } from "@/lib/firebaseInit";
import { onAuthStateChanged } from "firebase/auth";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/state/store";
import syncUser, { stopUserSync } from "@/state/auth/actions/setUser";

// Keeps the Redux auth state in sync with Firebase Auth. Navbar and Footer stay in the root layout because Footer is a server component.
const App = ({ children }: { children: ReactNode }) => {
   const dispatch = useDispatch<AppDispatch>();

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

   return <>{children}</>;
};

export default App;
