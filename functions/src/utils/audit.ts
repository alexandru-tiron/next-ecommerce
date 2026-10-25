import { FieldValue, getFirestore } from "firebase-admin/firestore";

export type AuditAction = "role_changed" | "setup_claimed" | "setup_token_created";

// Records a sensitive change in AuditLog (readable by owners and admins, written only here)
export async function audit(action: AuditAction, by: { uid: string; email: string } | "cli", details: Record<string, unknown>) {
   await getFirestore()
      .collection("AuditLog")
      .add({ action, ...(by === "cli" ? { by: "cli" } : { by_uid: by.uid, by_email: by.email }), ...details, created_at: FieldValue.serverTimestamp() });
}
