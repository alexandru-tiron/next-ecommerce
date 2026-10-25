// Gives an existing account a team role (owner, admin or staff; see packages/core/src/roles.ts), or removes it.
// With the setup wizard's one-time link, this is how a store gets its first owner: there is deliberately no public endpoint for it.
// Usage:
//   npm run make-admin -- --email owner@example.com [--role owner|admin|staff] --project <id> --yes
//   npm run make-admin -- --email owner@example.com --revoke --project <id> --yes
// The role is "owner" unless given. The account is signed out everywhere, so the change applies when it signs back in.
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { connectFirebase, parseArgs } from "./lib/firebase.mjs";

const ROLES = ["owner", "admin", "staff"];
const args = parseArgs();
if (typeof args.email !== "string") throw new Error("Pass the account's e-mail: --email owner@example.com");
const revoke = Boolean(args.revoke);
const role = revoke ? null : typeof args.role === "string" ? args.role : "owner";
if (role !== null && !ROLES.includes(role)) throw new Error(`--role must be one of ${ROLES.join(", ")}`);

const { projectId, emulator } = connectFirebase(args, { write: true });
const auth = getAuth();
const user = await auth.getUserByEmail(args.email).catch(() => null);
if (!user) throw new Error(`No account with the e-mail ${args.email} in ${emulator ? "the emulators" : projectId}. Create it by signing up in the store first.`);

// The role claim replaces the old isAdmin flag
const { isAdmin: _legacy, role: previous, ...claims } = user.customClaims ?? {};
await auth.setCustomUserClaims(user.uid, role ? { ...claims, role } : claims);
await auth.revokeRefreshTokens(user.uid);

// The team list in Admin → Team, and the record of the change
const db = getFirestore();
if (role) await db.doc(`Team/${user.uid}`).set({ email: user.email, name: user.displayName ?? null, role, updated_at: FieldValue.serverTimestamp(), updated_by: "cli" });
else await db.doc(`Team/${user.uid}`).delete();
await db.collection("AuditLog").add({ action: "role_changed", by: "cli", target_uid: user.uid, target_email: user.email, from: previous ?? (_legacy === true ? "owner" : null), to: role, created_at: FieldValue.serverTimestamp() });

const where = emulator ? "the emulators" : projectId;
console.log(role ? `Gave ${args.email} (${user.uid}) the role ${role} in ${where}.` : `Removed ${args.email} (${user.uid}) from the team in ${where}.`);
