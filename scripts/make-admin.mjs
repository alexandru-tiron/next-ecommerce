// Gives an existing account admin rights (the isAdmin custom claim). This is how a store gets its first admin:
// there is deliberately no public endpoint for it.
// Usage:
//   npm run make-admin -- --email owner@example.com --project <id> --yes
//   npm run make-admin -- --email owner@example.com --revoke --project <id> --yes
// The person has to sign out and back in (or wait up to an hour) for the change to take effect.
import { getAuth } from "firebase-admin/auth";
import { connectFirebase, parseArgs } from "./lib/firebase.mjs";

const args = parseArgs();
if (typeof args.email !== "string") throw new Error("Pass the account's e-mail: --email owner@example.com");

const { projectId, emulator } = connectFirebase(args, { write: true });
const auth = getAuth();
const user = await auth.getUserByEmail(args.email).catch(() => null);
if (!user) throw new Error(`No account with the e-mail ${args.email} in ${emulator ? "the emulators" : projectId}. Create it by signing up in the store first.`);

const revoke = Boolean(args.revoke);
await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), isAdmin: !revoke });
// Signs the account out everywhere so the new rights apply on the next sign-in
await auth.revokeRefreshTokens(user.uid);
console.log(`${revoke ? "Removed admin rights from" : "Gave admin rights to"} ${args.email} (${user.uid}) in ${emulator ? "the emulators" : projectId}.`);
