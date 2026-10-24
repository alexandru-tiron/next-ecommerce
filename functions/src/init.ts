import { setGlobalOptions } from "firebase-functions/v2";
import { initializeApp } from "firebase-admin/app";

// Imported first by index.ts. Imported modules run before the file importing them, and several call
// getFirestore() as soon as they load, so the Admin SDK must be initialized in a module of its own.
initializeApp();

// Set global options for all functions
setGlobalOptions({ region: "europe-west3" });
