// Creates a one-time link to the setup wizard (/setup), valid for 7 days. Whoever opens it, signed in, becomes the store's owner.
// Usage:
//   npm run setup-link -- --site https://shop.example.com --project <id> --yes
//   npm run setup-link                       (the emulators, with http://localhost:3000)
// A new link replaces any earlier unused one. Once the wizard is finished, links stop working.
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { connectFirebase, parseArgs } from "./lib/firebase.mjs";
import { newSetupToken, SETUP_TOKEN_DAYS, setupLink } from "./lib/setup-token.mjs";

const args = parseArgs();
const { projectId, emulator } = connectFirebase(args, { write: true });
const site = typeof args.site === "string" ? args.site : emulator ? "http://localhost:3000" : null;
if (!site) throw new Error("Pass the store's address: --site https://shop.example.com");

const db = getFirestore();
if ((await db.doc("Settings/System").get()).data()?.setup_completed === true) {
   console.warn("This store's setup is already finished, so the link won't work. Team members are managed in Admin → Team.");
}

const { token, hash, expiresAt } = newSetupToken();
await db.doc("System/setup").set({ token_hash: hash, created_at: FieldValue.serverTimestamp(), expires_at: Timestamp.fromDate(expiresAt), used_at: null });
await db.collection("AuditLog").add({ action: "setup_token_created", by: "cli", created_at: FieldValue.serverTimestamp() });

console.log(`Setup link for ${emulator ? "the emulators" : projectId} (valid ${SETUP_TOKEN_DAYS} days, works once):`);
console.log(setupLink(site, token));
