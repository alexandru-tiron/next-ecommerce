import "server-only";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const APP_NAME = "store-auth";
const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === "true";

// Checking ID tokens needs only the project id, not a service account key
function authApp() {
   const existing = getApps().find((app) => app.name === APP_NAME);
   if (existing) return existing;
   if (useEmulators) process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";
   return initializeApp({ projectId: useEmulators ? "demo-store" : process.env.NEXT_PUBLIC_PROJECTID }, APP_NAME);
}

// True when the token belongs to a signed-in admin (the isAdmin custom claim)
export async function isAdminToken(token: string) {
   try {
      return (await getAuth(authApp()).verifyIdToken(token)).isAdmin === true;
   } catch {
      return false;
   }
}
