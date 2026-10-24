import { defineString } from "firebase-functions/params";

// Public store URL, used for links in e-mails and as the return address after card payments (functions/.env)
export const siteUrl = defineString("SITE_URL", { description: "Public URL of the store, e.g. https://shop.example.com" });
