import { createAsyncThunk } from "@reduxjs/toolkit";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebaseInit";
import { AuthError, toAuthError } from "../authError";

// Resolves with the email the reset link was sent to
const handleResetPassword = createAsyncThunk<string, string, { rejectValue: AuthError }>("auth/resetPassword", async (email, { rejectWithValue }) => {
   try {
      await sendPasswordResetEmail(auth, email);
      return email;
   } catch (error) {
      return rejectWithValue(toAuthError(error));
   }
});

export default handleResetPassword;
