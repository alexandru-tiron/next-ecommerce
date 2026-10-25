// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { connectStorageEmulator, getStorage } from "firebase/storage";
// import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// `npm run dev:emulators` runs the store against the local Firebase emulators, filled by `npm run seed:emulators`.
// They use the offline "demo-store" project, the same id the emulator scripts start with.
const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === "true";
const EMULATOR_PROJECT_ID = "demo-store";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
   apiKey: process.env.NEXT_PUBLIC_APIKEY || (useEmulators ? "demo-api-key" : undefined),
   authDomain: process.env.NEXT_PUBLIC_AUTHDOMAIN,
   projectId: useEmulators ? EMULATOR_PROJECT_ID : process.env.NEXT_PUBLIC_PROJECTID,
   storageBucket: useEmulators ? `${EMULATOR_PROJECT_ID}.appspot.com` : process.env.NEXT_PUBLIC_STORAGEBUCKET,
   messagingSenderId: process.env.NEXT_PUBLIC_MESSAGINGSENDERID,
   appId: process.env.NEXT_PUBLIC_APPID,
   measurementId: process.env.NEXT_PUBLIC_MEASUREMENTID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
export default app;

// App Check proves that requests to Firebase and the Cloud Functions come from this site.
// It starts once NEXT_PUBLIC_RECAPTCHA_SITE_KEY (a reCAPTCHA Enterprise key) is set, and only in the browser:
// server-rendered pages read Firestore without it. The emulators don't check it.
const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
if (typeof window !== "undefined" && recaptchaSiteKey && !useEmulators) {
   // Local development sends a debug token registered in the Firebase console instead of solving reCAPTCHA.
   // Never in production builds: anyone could copy the token from the page.
   if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN) {
      (self as typeof self & { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN = process.env.NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN;
   }
   initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey), isTokenAutoRefreshEnabled: true });
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Ports match firebase.json. getFunctions returns the same instance for a region, so every callable uses the emulator.
if (useEmulators) {
   connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
   connectFirestoreEmulator(db, "127.0.0.1", 8080);
   connectStorageEmulator(storage, "127.0.0.1", 9199);
   connectFunctionsEmulator(getFunctions(app, "europe-west3"), "127.0.0.1", 5001);
}
