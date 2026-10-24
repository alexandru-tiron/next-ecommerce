import { auth, db } from "@/lib/firebaseInit";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

// Creates or updates the Users/{uid} document after signup or Google sign-in
export async function updateUserProfile(userId: string, data: { first_name?: string; last_name?: string; phone_no?: string }) {
   const userRef = doc(db, "Users", userId);
   const userSnap = await getDoc(userRef);

   if (userSnap.exists()) {
      await updateDoc(userRef, data);
   } else {
      await setDoc(userRef, data, { merge: true });
      if (auth.currentUser && data.first_name && data.last_name) {
         await updateProfile(auth.currentUser, {
            displayName: `${data.first_name} ${data.last_name}`,
         });
      }
   }
}
