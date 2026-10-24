import { logger } from "firebase-functions/v2";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { OPERATION_TYPE, updateProductToAlgolia } from "../utils/updateProductToAlgolia";
import { getVariants } from "../utils/productUtils";

export const syncVariantsToAlgolia = onDocumentWritten("Products/{productId}/Variants/{variantId}", async (event) => {
   const productId = event.params.productId;
   const variantId = event.params.variantId;
   logger.info(`[Firebase] Variant sync triggered for product ${productId}, variant ${variantId}`);

   try {
      const variants = await getVariants(productId);
      logger.info(`[Firebase] Starting Algolia sync for variants of product ${productId}`);
      await updateProductToAlgolia(productId, OPERATION_TYPE.UPDATE, undefined, variants);
      logger.info(`[Firebase] Successfully completed variant sync for ${productId}`);
   } catch (error: any) {
      logger.error(`[Firebase] Error in syncVariantsToAlgolia for product ${productId}:`, error);
      throw error;
   }
});
