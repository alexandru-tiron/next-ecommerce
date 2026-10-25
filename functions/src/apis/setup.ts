import { createHash, timingSafeEqual } from "crypto";
import { logger } from "firebase-functions/v2";
import { onCall } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { storeInfoFrom, systemFrom } from "@core/settings";
import { enforceAppCheck } from "../utils/params";
import { parseInput } from "../utils/validation";
import { storeError } from "../utils/errors";
import { audit } from "../utils/audit";
import { setupClaimSchema } from "../schemas";

const sha256 = (text: string) => createHash("sha256").update(text).digest();

// The setup wizard (/setup): a signed-in visitor with the one-time setup link becomes the store's owner.
// The link comes from the setup CLI or `npm run setup-link`; only its hash is stored, in System/setup (closed to browsers).
// It works once, expires after 7 days, and never once the setup is finished (Settings/System).
export const claimSetup = onCall({ enforceAppCheck, maxInstances: 2 }, async (request) => {
   if (!request.auth) throw storeError("unauthenticated", "not_signed_in");
   const { token } = parseInput(setupClaimSchema, request.data, "setup_token_invalid");
   const db = getFirestore();

   const [system, info] = await Promise.all([db.doc("Settings/System").get(), db.doc("Settings/Info").get()]);
   if (systemFrom(system.data(), storeInfoFrom(info.data())).setup_completed) throw storeError("failed-precondition", "setup_done");

   const setupRef = db.doc("System/setup");
   await db.runTransaction(async (transaction) => {
      const setup = (await transaction.get(setupRef)).data();
      const stored = typeof setup?.token_hash === "string" && /^[0-9a-f]{64}$/.test(setup.token_hash) ? Buffer.from(setup.token_hash, "hex") : null;
      const expiresAt = setup?.expires_at instanceof Timestamp ? setup.expires_at.toMillis() : 0;
      const valid = stored !== null && timingSafeEqual(stored, sha256(token)) && !setup?.used_at && expiresAt > Date.now();
      if (!valid) {
         logger.warn(`[Setup] Rejected a setup claim from ${request.auth!.uid}`);
         throw storeError("permission-denied", "setup_token_invalid");
      }
      transaction.update(setupRef, { used_at: FieldValue.serverTimestamp(), used_by: request.auth!.uid });
   });

   const auth = getAuth();
   const user = await auth.getUser(request.auth.uid);
   const { isAdmin: _legacy, ...claims } = user.customClaims ?? {};
   await auth.setCustomUserClaims(user.uid, { ...claims, role: "owner" });
   await db.doc(`Team/${user.uid}`).set({ email: user.email ?? "", name: user.displayName ?? null, role: "owner", updated_at: FieldValue.serverTimestamp(), updated_by: "setup" });
   await audit("setup_claimed", { uid: user.uid, email: user.email ?? "" }, {});
   logger.info(`[Setup] ${user.uid} claimed the store as its owner`);
   return { role: "owner" };
});
