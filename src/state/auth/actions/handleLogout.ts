import { createAsyncThunk } from "@reduxjs/toolkit";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebaseInit";
import { AuthError, toAuthError } from "../authError";

// App.tsx clears the user and switches back to the guest cart once onAuthStateChanged reports the sign-out
const handleLogout = createAsyncThunk<void, void, { rejectValue: AuthError }>("auth/logout", async (_, { rejectWithValue }) => {
   try {
      await signOut(auth);
   } catch (error) {
      return rejectWithValue(toAuthError(error));
   }
});

export default handleLogout;
