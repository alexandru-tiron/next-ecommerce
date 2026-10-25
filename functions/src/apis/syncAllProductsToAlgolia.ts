import { logger } from "firebase-functions/v2";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { OPERATION_TYPE, updateProductToAlgolia } from "../utils/updateProductToAlgolia";
import { Product } from "../types/product";
import { getVariants, getSkuVariants } from "../utils/productUtils";
import { algoliaWriteKey, enforceAppCheck } from "../utils/params";
import { getFirestore } from "firebase-admin/firestore";
import { requirePermission } from "../utils/roles";
const db = getFirestore();

// Full reindex of every product into Algolia. Admin-only, called from Admin → Settings.
export const syncAllProductsToAlgolia = onCall({ timeoutSeconds: 540, enforceAppCheck, secrets: [algoliaWriteKey] }, async (request) => {
   const caller = requirePermission(request, "manageStore");
   logger.info(`[Firebase] Starting full product sync to Algolia (requested by ${caller.uid})`);

   try {
      // Get all products
      const productsSnap = await db.collection("Products").get();
      logger.info(`[Firebase] Found ${productsSnap.size} products to sync`);
      if (productsSnap.empty) {
         logger.info("No documents found.");
         return { success: true, message: "No products to sync", successCount: 0, errorCount: 0 };
      }
      // Process products in batches to avoid memory issues
      const batchSize = 10;
      const batches = [];

      for (let i = 0; i < productsSnap.docs?.length; i += batchSize) {
         batches.push(productsSnap.docs.slice(i, i + batchSize));
      }

      let successCount = 0;
      let errorCount = 0;

      for (const batch of batches) {
         await Promise.all(
            batch.map(async (doc) => {
               try {
                  const productId = doc.id;
                  const productData = doc.data() as Product;

                  // Get variants and SKU variants in parallel
                  const [variants, skuVariants] = await Promise.all([getVariants(productId), getSkuVariants(productId)]);

                  // Combine all data
                  const algoliaObject = {
                     ...productData,
                     variants,
                     sku_variants: skuVariants,
                  };

                  await updateProductToAlgolia(productId, OPERATION_TYPE.CREATE, algoliaObject as Product);
                  successCount++;
                  logger.info(`[Firebase] Successfully synced product ${productId}`);
               } catch (error: any) {
                  errorCount++;
                  logger.error(`[Firebase] Error syncing product ${doc.id}:`, error);
               }
            })
         );
      }

      logger.info(`[Firebase] Completed full product sync. Success: ${successCount}, Errors: ${errorCount}`);

      return {
         success: true,
         message: `Sync completed. Success: ${successCount}, Errors: ${errorCount}`,
         successCount,
         errorCount,
      };
   } catch (error: any) {
      logger.error("[Firebase] Error in full product sync:", error);
      throw new HttpsError("internal", "Failed to sync products");
   }
});
