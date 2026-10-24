import { createAsyncThunk } from "@reduxjs/toolkit";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebaseInit";
import { AuthError, toAuthError } from "../authError";
import { updateUserProfile } from "./updateUserProfile";

const handleGoogleSignIn = createAsyncThunk<void, void, { rejectValue: AuthError }>("auth/googleSignIn", async (_, { rejectWithValue }) => {
   try {
      const { user } = await signInWithPopup(auth, new GoogleAuthProvider());

      // Extract name parts from display name
      const nameParts = (user.displayName || "").split(" ");
      await updateUserProfile(user.uid, {
         first_name: nameParts[0] || "",
         last_name: nameParts.slice(1).join(" ") || "",
      });
   } catch (error) {
      return rejectWithValue(toAuthError(error));
   }
});

export default handleGoogleSignIn;
