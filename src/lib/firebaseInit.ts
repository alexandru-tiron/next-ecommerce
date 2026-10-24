// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
   apiKey: process.env.NEXT_PUBLIC_APIKEY,
   authDomain: process.env.NEXT_PUBLIC_AUTHDOMAIN,
   // databaseURL: process.env.NEXT_PUBLIC_DATABASEURL,
   projectId: process.env.NEXT_PUBLIC_PROJECTID,
   storageBucket: process.env.NEXT_PUBLIC_STORAGEBUCKET,
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
// server-rendered pages read Firestore without it.
const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
if (typeof window !== "undefined" && recaptchaSiteKey) {
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
