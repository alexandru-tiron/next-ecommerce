import { createAsyncThunk } from "@reduxjs/toolkit";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { auth } from "@/lib/firebaseInit";
import type { RootState } from "@/state/store";
import { AuthError, toAuthError } from "../authError";

const handleChangePassword = createAsyncThunk<void, { currentPassword: string; newPassword: string }, { state: RootState; rejectValue: AuthError }>(
   "auth/changePassword",
   async ({ currentPassword, newPassword }, { getState, rejectWithValue }) => {
      const { user } = getState().auth;
      try {
         if (!auth.currentUser || !user?.db) {
            throw new Error("User not logged in");
         }

         // Re-authenticate user before changing password
         const credential = EmailAuthProvider.credential(user.db.email, currentPassword);
         await reauthenticateWithCredential(auth.currentUser, credential);
         await updatePassword(auth.currentUser, newPassword);
      } catch (error) {
         return rejectWithValue(toAuthError(error));
      }
   },
   // Do nothing until the user's Firestore document has loaded
   { condition: (_, { getState }) => !!getState().auth.user?.db }
);

export default handleChangePassword;
