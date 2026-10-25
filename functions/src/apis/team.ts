import { logger } from "firebase-functions/v2";
import { onCall } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { canAssignRole, roleFromClaims } from "@core/roles";
import { enforceAppCheck } from "../utils/params";
import { parseInput } from "../utils/validation";
import { storeError } from "../utils/errors";
import { requirePermission } from "../utils/roles";
import { audit } from "../utils/audit";
import { roleInputSchema } from "../schemas";

// Admin → Team: an owner gives an existing account a role, changes it, or removes it (role: null).
// The account's sessions are revoked, so the change applies within the hour at most. Team/{uid} mirrors the
// role for the team list. Nobody changes their own role, so a store always keeps at least one owner.
export const setUserRole = onCall({ enforceAppCheck, maxInstances: 5 }, async (request) => {
   const actor = requirePermission(request, "manageTeam");
   const { email, role } = parseInput(roleInputSchema, request.data);

   const auth = getAuth();
   const target = await auth.getUserByEmail(email).catch(() => null);
   if (!target) throw storeError("not-found", "user_not_found");
   const current = roleFromClaims(target.customClaims);
   if (!canAssignRole(actor, { uid: target.uid, role: current }, role)) throw storeError("failed-precondition", "own_role");

   // The role claim replaces the old isAdmin flag
   const { isAdmin: _legacy, role: _previous, ...claims } = target.customClaims ?? {};
   await auth.setCustomUserClaims(target.uid, role ? { ...claims, role } : claims);
   if (current !== role) await auth.revokeRefreshTokens(target.uid);

   const member = getFirestore().doc(`Team/${target.uid}`);
   if (role) {
      await member.set({ email: target.email ?? email, name: target.displayName ?? null, role, updated_at: FieldValue.serverTimestamp(), updated_by: actor.email });
   } else {
      await member.delete();
   }
   await audit("role_changed", actor, { target_uid: target.uid, target_email: target.email ?? email, from: current, to: role });
   logger.info(`[Team] ${actor.uid} changed the role of ${target.uid} from ${current ?? "none"} to ${role ?? "none"}`);
   return { uid: target.uid, email: target.email ?? email, role };
});
