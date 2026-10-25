import { logger } from "firebase-functions/v2";
import { onCall } from "firebase-functions/v2/https";
import { applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { rulesVersionOf, RULES_VERSION } from "@core/rulesVersion";
import { CheckStatus, SecurityCheck, SecurityCheckId } from "@core/setupChecks";
import { enforceAppCheck, inEmulator } from "../utils/params";
import { requirePermission } from "../utils/roles";

const project = () => process.env.GCLOUD_PROJECT ?? "";

// A Google API call with the functions' service account. Throws on any error, which the check reports as "unknown".
async function google<T>(url: string): Promise<T> {
   const { access_token } = await applicationDefault().getAccessToken();
   const response = await fetch(url, { headers: { Authorization: `Bearer ${access_token}` } });
   if (!response.ok) throw new Error(`${response.status} ${url.split("?")[0]}`);
   return (await response.json()) as T;
}

async function rulesVersion(release: string) {
   const { rulesetName } = await google<{ rulesetName: string }>(`https://firebaserules.googleapis.com/v1/projects/${project()}/releases/${release}`);
   const ruleset = await google<{ source: { files: { content: string }[] } }>(`https://firebaserules.googleapis.com/v1/${rulesetName}`);
   return rulesVersionOf(ruleset.source.files.map((file) => file.content).join("\n"));
}

const checks: Record<SecurityCheckId, () => Promise<{ status: CheckStatus; count?: number }>> = {
   // Callable functions reject requests without an App Check token (ENFORCE_APP_CHECK in functions/.env)
   appCheckFunctions: async () => ({ status: enforceAppCheck ? "ok" : "warn" }),
   appCheckFirestore: async () => {
      const service = await google<{ enforcementMode?: string }>(`https://firebaseappcheck.googleapis.com/v1/projects/${project()}/services/firestore.googleapis.com`);
      return { status: service.enforcementMode === "ENFORCED" ? "ok" : "warn" };
   },
   // The deployed Firestore and Storage rules carry the same version marker as this code
   rules: async () => {
      const { defaultBucket } = await google<{ defaultBucket?: { name: string } }>(`https://firebasestorage.googleapis.com/v1beta/projects/${project()}/defaultBucket`).catch(() => ({ defaultBucket: undefined }));
      const bucket = defaultBucket?.name.split("/").pop();
      const versions = await Promise.all([rulesVersion("cloud.firestore"), ...(bucket ? [rulesVersion(`firebase.storage/${bucket}`)] : [])]);
      return { status: versions.every((version) => version === RULES_VERSION) ? "ok" : "warn" };
   },
   // Owners and admins should sign in with a second step (Authentication → Sign-in method → Multi-factor)
   adminMfa: async () => {
      const team = await getFirestore().collection("Team").where("role", "in", ["owner", "admin"]).get();
      const users = await Promise.all(team.docs.map((member) => getAuth().getUser(member.id).catch(() => null)));
      const without = users.filter((user) => user && !(user.multiFactor?.enrolledFactors?.length ?? 0)).length;
      return { status: without === 0 ? "ok" : "warn", count: without };
   },
   // Point-in-time recovery or a backup schedule on the default database
   backups: async () => {
      const base = `https://firestore.googleapis.com/v1/projects/${project()}/databases/(default)`;
      const [database, schedules] = await Promise.all([google<{ pointInTimeRecoveryEnablement?: string }>(base), google<{ backupSchedules?: unknown[] }>(`${base}/backupSchedules`)]);
      const enabled = database.pointInTimeRecoveryEnablement === "POINT_IN_TIME_RECOVERY_ENABLED" || (schedules.backupSchedules?.length ?? 0) > 0;
      return { status: enabled ? "ok" : "warn" };
   },
   // A budget on the project's billing account. Reading budgets needs billing permissions the functions usually lack.
   budget: async () => {
      const billing = await google<{ billingAccountName?: string; billingEnabled?: boolean }>(`https://cloudbilling.googleapis.com/v1/projects/${project()}/billingInfo`);
      if (!billing.billingEnabled || !billing.billingAccountName) return { status: "warn" };
      const { projectNumber } = await google<{ projectNumber: string }>(`https://cloudresourcemanager.googleapis.com/v1/projects/${project()}`);
      const { budgets = [] } = await google<{ budgets?: { budgetFilter?: { projects?: string[] } }[] }>(`https://billingbudgets.googleapis.com/v1/${billing.billingAccountName}/budgets`);
      const covered = budgets.some((budget) => !budget.budgetFilter?.projects?.length || budget.budgetFilter.projects.includes(`projects/${projectNumber}`));
      return { status: covered ? "ok" : "warn" };
   },
};

// Admin → dashboard checklist: the live security settings of the project, for owners and admins
export const getSetupStatus = onCall({ enforceAppCheck, maxInstances: 2, timeoutSeconds: 30 }, async (request): Promise<{ checks: SecurityCheck[] }> => {
   requirePermission(request, "manageStore");
   const results = await Promise.all(
      (Object.keys(checks) as SecurityCheckId[]).map(async (id): Promise<SecurityCheck> => {
         if (inEmulator && id !== "appCheckFunctions" && id !== "adminMfa") return { id, status: "unknown" };
         try {
            return { id, ...(await checks[id]()) };
         } catch (error) {
            logger.info(`[Setup] The ${id} check couldn't run: ${(error as Error).message}`);
            return { id, status: "unknown" };
         }
      })
   );
   return { checks: results };
});
