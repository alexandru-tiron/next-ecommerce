import { createAsyncThunk } from "@reduxjs/toolkit";
import { sendEmailVerification } from "firebase/auth";
import { auth } from "@/lib/firebaseInit";
import { AuthError, toAuthError } from "../authError";

const handleResendVerificationEmail = createAsyncThunk<void, void, { rejectValue: AuthError }>("auth/resendVerificationEmail", async (_, { rejectWithValue }) => {
   try {
      if (!auth.currentUser) {
         throw new Error("User not logged in");
      }
      await sendEmailVerification(auth.currentUser);
   } catch (error) {
      return rejectWithValue(toAuthError(error));
   }
});

export default handleResendVerificationEmail;
