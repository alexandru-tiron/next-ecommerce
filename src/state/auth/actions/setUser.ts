import { db } from "@/lib/firebaseInit";
import { UserData } from "@/types/user";
import { createAsyncThunk } from "@reduxjs/toolkit";
import type { User as FirebaseUser } from "firebase/auth";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { AuthUser, clearUser, setUser } from "../authSlice";

// Firestore unsubscribe functions aren't serializable, so the active listener lives here instead of in the store
let unsubscribeUserDocument: (() => void) | null = null;

export function stopUserSync() {
   unsubscribeUserDocument?.();
   unsubscribeUserDocument = null;
}

const syncUser = createAsyncThunk("auth/syncUser", async (user: FirebaseUser, { dispatch }) => {
   stopUserSync();

   // Check admin status
   const token = await user.getIdTokenResult();
   const admin = token.claims.isAdmin === true;

   // Set up real-time listener for user document
   unsubscribeUserDocument = onSnapshot(
      doc(db, "Users", user.uid),
      (docSnapshot) => {
         // A missing document is created by the onUserCreate Cloud Function; the listener fires again once it exists
         const userData = docSnapshot.exists() ? toSerializableUserData(docSnapshot.data() as UserData) : undefined;
         persistUserSession(user);
         dispatch(setUser(toAuthUser(user, userData)));
      },
      (error) => {
         console.error("Error listening to user document:", error);
         dispatch(clearUser());
      }
   );

   return { admin };
});

export default syncUser;

function toAuthUser(user: FirebaseUser, userData?: UserData): AuthUser {
   return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
      photoURL: user.photoURL,
      providerId: user.providerData[0]?.providerId ?? null,
      db: userData && {
         ...userData,
         addresses: userData.addresses || [],
      },
   };
}

function toSerializableUserData(userData: UserData): UserData {
   const createdAt = userData.created_at;
   return {
      ...userData,
      created_at: createdAt instanceof Timestamp ? { _seconds: createdAt.seconds, _nanoseconds: createdAt.nanoseconds } : createdAt,
   };
}

// Persist minimal user data
const persistUserSession = (currentUser: FirebaseUser) => {
   const minimalUserData = {
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName,
      emailVerified: currentUser.emailVerified,
   };
   sessionStorage.setItem("authUser", JSON.stringify(minimalUserData));
};
