import { createAsyncThunk } from "@reduxjs/toolkit";
import { deleteUser, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebaseInit";
import type { RootState } from "@/state/store";
import { AuthError, toAuthError } from "../authError";

// Google accounts pass "google-auth" as the password, since they can't re-authenticate with one
const handleDeleteAccount = createAsyncThunk<void, string, { state: RootState; rejectValue: AuthError }>(
   "auth/deleteAccount",
   async (password, { getState, rejectWithValue }) => {
      const { user } = getState().auth;
      try {
         if (!auth.currentUser || !user?.db) {
            throw new Error("User not logged in");
         }

         if (user.providerId === "google.com") {
            // We can't re-authenticate Google accounts with a password, so rely on a recent sign-in
            await deleteUser(auth.currentUser);
         } else {
            if (password === "google-auth") {
               throw new Error("Invalid password for email/password account");
            }
            const userCredential = await signInWithEmailAndPassword(auth, user.db.email, password);
            await deleteUser(userCredential.user);
         }
      } catch (error) {
         return rejectWithValue(toAuthError(error));
      }
   },
   // Do nothing until the user's Firestore document has loaded
   { condition: (_, { getState }) => !!getState().auth.user?.db }
);

export default handleDeleteAccount;
