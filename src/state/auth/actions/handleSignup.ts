import { createAsyncThunk } from "@reduxjs/toolkit";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth } from "@/lib/firebaseInit";
import { AuthError, toAuthError } from "../authError";
import { updateUserProfile } from "./updateUserProfile";

interface SignupArgs {
   email: string;
   password: string;
   firstName: string;
   lastName: string;
   phoneNumber: string;
}

// Resolves with the email the verification link was sent to
const handleSignup = createAsyncThunk<string, SignupArgs, { rejectValue: AuthError }>("auth/signup", async ({ email, password, firstName, lastName, phoneNumber }, { rejectWithValue }) => {
   try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(user);
      await updateUserProfile(user.uid, {
         first_name: firstName,
         last_name: lastName,
         phone_no: phoneNumber,
      });
      return email;
   } catch (error) {
      return rejectWithValue(toAuthError(error));
   }
});

export default handleSignup;
