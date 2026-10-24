import { defineSecret, defineString } from "firebase-functions/params";

// Public store URL, used for links in e-mails and as the return address after card payments (functions/.env)
export const siteUrl = defineString("SITE_URL", { description: "Public URL of the store, e.g. https://shop.example.com" });

// Kept in Secret Manager instead of functions/.env: set them with `firebase functions:secrets:set <NAME>`.
// Every function that reads one must list it in its `secrets` option.
export const emailPassword = defineSecret("EMAIL_PASSWORD");
export const algoliaWriteKey = defineSecret("ALGOLIA_API_WRITE_KEY");

// Callable functions reject requests without a valid App Check token once ENFORCE_APP_CHECK=true is set in functions/.env
export const enforceAppCheck = process.env.ENFORCE_APP_CHECK === "true";
