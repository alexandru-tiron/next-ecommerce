import { logger } from "firebase-functions/v2";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { OPERATION_TYPE, updateProductToAlgolia } from "../utils/updateProductToAlgolia";
import { Product } from "../types/product";
import { getVariants, getSkuVariants } from "../utils/productUtils";
import { algoliaWriteKey } from "../utils/params";

export const syncProductToAlgolia = onDocumentWritten({ document: "Products/{productId}", secrets: [algoliaWriteKey] }, async (event) => {
   const productId = event.params.productId;
   logger.info(`[Firebase] Product sync triggered for ${productId}`);

   try {
      // Handle deletion
      if (!event.data?.after.data()) {
         logger.info(`[Firebase] Product ${productId} was deleted, triggering Algolia deletion`);
         await updateProductToAlgolia(productId, OPERATION_TYPE.DELETE);
         return;
      }

      // Get the change type
      const beforeData = event.data.before?.data();

      const afterData = event.data.after.data();

      if (!afterData) {
         logger.error(`[Firebase] No product data found for ${productId}`);
         throw new Error("No product data found");
      }

      // Check if this is a new product
      if (!event.data.before.data()) {
         logger.info(`[Firebase] New product detected for ${productId}, performing full sync`);
         // Get variants and SKU variants in parallel
         const [variants, skuVariants] = await Promise.all([getVariants(productId), getSkuVariants(productId)]);

         // Combine all data for new product
         const algoliaObject = {
            ...afterData,
            variants,
            sku_variants: skuVariants,
         };

         await updateProductToAlgolia(productId, OPERATION_TYPE.CREATE, algoliaObject as Product);
         return;
      }

      // For updates, check what changed in the product document
      const changedFields = Object.keys(afterData).filter((key) => JSON.stringify(beforeData?.[key]) !== JSON.stringify(afterData[key]));

      logger.info(`[Firebase] Changed fields in product ${productId}: ${changedFields.join(", ") || "none"}`);

      // If there are changes to the product document, update only those fields
      if (changedFields?.length > 0) {
         const changedData = {
            ...changedFields.reduce((acc, key) => {
               acc[key as keyof Product] = afterData[key];
               return acc;
            }, {} as Partial<Product>),
         };
         await updateProductToAlgolia(productId, OPERATION_TYPE.UPDATE, changedData as Partial<Product>);
         return;
      }

      // If no product document fields changed, this might be a subcollection change
      // triggered by the other functions (syncVariantsToAlgolia or syncSkuVariantsToAlgolia)
      logger.info(`[Firebase] No product document fields changed for ${productId}, skipping update`);
   } catch (error: any) {
      logger.error(`[Firebase] Error in syncProductToAlgolia for ${productId}:`, error);
      throw error;
   }
});
