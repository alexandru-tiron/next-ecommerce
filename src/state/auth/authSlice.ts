import { UserData } from "@/types/user";
import { PayloadAction, createSlice, isFulfilled, isPending, isRejected } from "@reduxjs/toolkit";
import { AuthError } from "./authError";
import handleChangePassword from "./actions/handleChangePassword";
import handleDeleteAccount from "./actions/handleDeleteAccount";
import handleGoogleSignIn from "./actions/handleGoogleSignIn";
import handleLogin from "./actions/handleLogin";
import handleLogout from "./actions/handleLogout";
import handleResendVerificationEmail from "./actions/handleResendVerificationEmail";
import handleResetPassword from "./actions/handleResetPassword";
import handleSignup from "./actions/handleSignup";
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

// Outcome of an auth action that App.tsx shows as a popup
export type AuthNotice = { type: "error"; error: AuthError } | { type: "signedUp"; email: string } | { type: "passwordResetSent"; email: string } | { type: "verificationSent" };

interface AuthState {
   user: AuthUser | null;
   admin: boolean;
   isAuthReady: boolean;
   isLoading: boolean;
   notice: AuthNotice | null;
}

const initialState: AuthState = {
   user: null,
   admin: false,
   isAuthReady: false,
   isLoading: false,
   notice: null,
};

const authActions = [handleLogin, handleSignup, handleLogout, handleResetPassword, handleDeleteAccount, handleGoogleSignIn, handleResendVerificationEmail, handleChangePassword] as const;

const authSlice = createSlice({
   name: "auth",
   initialState,
   reducers: {
      // Admin status arrives with the user so the admin pages never see a signed-in user without it
      setUser: (state: AuthState, action: PayloadAction<{ user: AuthUser; admin: boolean }>) => {
         state.user = action.payload.user;
         state.admin = action.payload.admin;
         state.isAuthReady = true;
      },
      clearUser: (state: AuthState) => ({ ...initialState, isAuthReady: true, isLoading: state.isLoading, notice: state.notice }),
      dismissNotice: (state: AuthState) => {
         state.notice = null;
      },
   },
   extraReducers: (builder) => {
      builder.addCase(syncUser.rejected, (state, action) => {
         console.error(action.error);
         state.user = null;
         state.admin = false;
         state.isAuthReady = true;
      });
      builder.addCase(handleSignup.fulfilled, (state, action) => {
         state.notice = { type: "signedUp", email: action.payload };
      });
      builder.addCase(handleResetPassword.fulfilled, (state, action) => {
         state.notice = { type: "passwordResetSent", email: action.payload };
      });
      builder.addCase(handleResendVerificationEmail.fulfilled, (state) => {
         state.notice = { type: "verificationSent" };
      });
      builder.addMatcher(isPending(...authActions), (state) => {
         state.isLoading = true;
      });
      builder.addMatcher(isFulfilled(...authActions), (state) => {
         state.isLoading = false;
      });
      builder.addMatcher(isRejected(...authActions), (state, action) => {
         state.isLoading = false;
         // No payload means the thunk's condition skipped it because the user hadn't loaded yet
         if (action.payload) {
            console.error(action.payload);
            state.notice = { type: "error", error: action.payload };
         }
      });
   },
});

export const { setUser, clearUser, dismissNotice } = authSlice.actions;

export default authSlice.reducer;
