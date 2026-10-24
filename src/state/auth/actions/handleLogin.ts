import { createAsyncThunk } from "@reduxjs/toolkit";
import { browserLocalPersistence, setPersistence, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebaseInit";
import { AuthError, toAuthError } from "../authError";

// The signed-in user reaches the store through onAuthStateChanged (see App.tsx), so this only reports failures
const handleLogin = createAsyncThunk<void, { email: string; password: string }, { rejectValue: AuthError }>("auth/login", async ({ email, password }, { rejectWithValue }) => {
   try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email, password);
   } catch (error) {
      return rejectWithValue(toAuthError(error));
   }
});

export default handleLogin;
