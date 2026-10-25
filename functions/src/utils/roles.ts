import { CallableRequest } from "firebase-functions/v2/https";
import { can, Permission, Role, roleFromClaims } from "@core/roles";
import { storeError } from "./errors";

// The caller's team role, or an error when they aren't signed in or their role doesn't allow `permission`
export function requirePermission(request: CallableRequest<unknown>, permission: Permission): { uid: string; email: string; role: Role } {
   if (!request.auth) throw storeError("unauthenticated", "not_signed_in");
   const role = roleFromClaims(request.auth.token);
   if (!role || !can(role, permission)) throw storeError("permission-denied", permission === "manageTeam" ? "not_owner" : "not_admin");
   return { uid: request.auth.uid, email: request.auth.token.email ?? "", role };
}
