import { UserData } from "@/types/user";
import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import handleLogin from "./actions/handleLogin";
import syncUser from "./actions/setUser";

// Plain, serializable copy of the Firebase user (the Firebase User object itself can't be stored in Redux)
export interface AuthUser {
   uid: string;
   email: string | null;
   displayName: string | null;
   emailVerified: boolean;
   photoURL: string | null;
   providerId: string | null;
   db?: UserData;
}

interface AuthState {
   user: AuthUser | null;
   admin: boolean;
   isAuthReady: boolean;
}

const initialState: AuthState = {
   user: null,
   admin: false,
   isAuthReady: false,
};

const authSlice = createSlice({
   name: "auth",
   initialState,
   reducers: {
      setUser: (state: AuthState, action: PayloadAction<AuthUser>) => {
         state.user = action.payload;
      },
      clearUser: () => ({ ...initialState, isAuthReady: true }),
   },
   extraReducers: (builder) => {
      builder.addCase(handleLogin.rejected, (state, action) => {
         console.log(action.payload ?? action.error);
         state.user = null;
         state.isAuthReady = true;
      });
      builder.addCase(syncUser.fulfilled, (state, action) => {
         state.admin = action.payload.admin;
         state.isAuthReady = true;
      });
      builder.addCase(syncUser.rejected, (state, action) => {
         console.log(action.error);
         state.user = null;
         state.isAuthReady = true;
      });
   },
});

export const { setUser, clearUser } = authSlice.actions;

export default authSlice.reducer;
