import { auth, db } from "@/lib/firebaseInit";
import { Address, UserData } from "@/types/user";
import { createAsyncThunk } from "@reduxjs/toolkit";
import type { User as FirebaseUser } from "firebase/auth";
import { collection, doc, onSnapshot, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { AuthUser, clearUser, setUser } from "../authSlice";

// Firestore unsubscribe functions aren't serializable, so the active listeners live here instead of in the store
let unsubscribers: (() => void)[] = [];

export function stopUserSync() {
   unsubscribers.forEach((unsubscribe) => unsubscribe());
   unsubscribers = [];
}

const syncUser = createAsyncThunk("auth/syncUser", async (user: FirebaseUser, { dispatch }) => {
   stopUserSync();

   // Check admin status
   const token = await user.getIdTokenResult();
   const admin = token.claims.isAdmin === true;

   // The user may have signed out while the token was loading
   if (auth.currentUser?.uid !== user.uid) return;

   let userData: UserData | undefined;
   let userDocLoaded = false;
   let addresses: Address[] = [];
   const publishUser = () => dispatch(setUser({ user: toAuthUser(user, userData, addresses), admin }));

   // Set up real-time listener for user document
   const userRef = doc(db, "Users", user.uid);
   const unsubscribeUserDocument = onSnapshot(
      userRef,
      (docSnapshot) => {
         if (!docSnapshot.exists() && user.email) {
            // Normally the onUserCreate Cloud Function creates it; the listener fires again once it exists
            setDoc(userRef, { email: user.email, created_at: serverTimestamp() }, { merge: true }).catch((error) => console.error("Error creating user document:", error));
         }
         userData = docSnapshot.exists() ? toSerializableUserData(docSnapshot.data() as UserData) : undefined;
         userDocLoaded = true;
         persistUserSession(user);
         publishUser();
      },
      (error) => {
         console.error("Error listening to user document:", error);
         dispatch(clearUser());
      }
   );

   // Addresses live in their own subcollection but are exposed as user.db.addresses
   const unsubscribeAddresses = onSnapshot(
      collection(db, "Users", user.uid, "Addresses"),
      (snapshot) => {
         addresses = snapshot.docs.map((addressDoc) => ({ id: addressDoc.id, ...(addressDoc.data() as Omit<Address, "id">) }));
         if (userDocLoaded) {
            publishUser();
         }
      },
      (error) => {
         console.error("Error listening to addresses collection:", error);
      }
   );

   unsubscribers = [unsubscribeUserDocument, unsubscribeAddresses];
});

export default syncUser;

function toAuthUser(user: FirebaseUser, userData: UserData | undefined, addresses: Address[]): AuthUser {
   return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
      photoURL: user.photoURL,
      providerId: user.providerData[0]?.providerId ?? null,
      db: userData && {
         ...userData,
         addresses,
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
