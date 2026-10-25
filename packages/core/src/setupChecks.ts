// The security checks on the admin dashboard, run on the server by the getSetupStatus Cloud Function.
// "unknown" means the check couldn't run (on the emulators, or without permission to read that setting).
export const SECURITY_CHECKS = ["appCheckFunctions", "appCheckFirestore", "rules", "adminMfa", "backups", "budget"] as const;
export type SecurityCheckId = (typeof SECURITY_CHECKS)[number];
export type CheckStatus = "ok" | "warn" | "unknown";
// count: e.g. how many owners and admins have no second sign-in step
export type SecurityCheck = { id: SecurityCheckId; status: CheckStatus; count?: number };
