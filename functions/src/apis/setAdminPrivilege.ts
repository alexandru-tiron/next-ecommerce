import { logger } from "firebase-functions/v2";
import admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";

export const setAdminPrivilege = onCall(
   {
      enforceAppCheck: false, // Set to true in production
      timeoutSeconds: 30,
      cors: false,
   },
   async (request) => {
      try {
         // Ensure the request has a valid caller
         if (!request.auth) {
            logger.error("[Firebase] Unauthorized request to setAdminPrivilege");
            throw new HttpsError("unauthenticated", "Unauthorized access");
         }

         // Check if the caller has admin privileges
         const callerUid = request.auth.uid;
         if (request.auth.token.isAdmin !== true) {
            logger.error(`[Firebase] Non-admin user ${callerUid} attempted to set admin privileges`);
            throw new HttpsError("permission-denied", "Permission denied: Only admins can set admin privileges");
         }

         // Get the target user ID from request data
         const { uid } = request.data;

         if (!uid || typeof uid !== "string") {
            logger.error("[Firebase] Invalid or missing UID in setAdminPrivilege request");
            throw new Error("Invalid request: UID is required");
         }

         // Verify the target user exists
         try {
            await admin.auth().getUser(uid);
         } catch (error: any) {
            logger.error(`[Firebase] User with UID ${uid} not found`);
            throw new Error(`User with UID ${uid} not found`);
         }

         // Set the custom claim
         await admin.auth().setCustomUserClaims(uid, { isAdmin: true });

         logger.info(`[Firebase] Admin privileges set for user ${uid} by ${callerUid}`);

         return {
            success: true,
            message: `Admin privileges set for user ${uid}`,
         };
      } catch (error: any) {
         logger.error("[Firebase] Error in setAdminPrivilege:", error);
         if (error instanceof HttpsError) throw error;
         throw new Error(`Failed to set admin privileges: ${error.message}`);
      }
   }
); 