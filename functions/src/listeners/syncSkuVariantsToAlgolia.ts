import { logger } from "firebase-functions/v2";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { OPERATION_TYPE, updateProductToAlgolia } from "../utils/updateProductToAlgolia";
import { getSkuVariants } from "../utils/productUtils";
import { algoliaWriteKey } from "../utils/params";

export const syncSkuVariantsToAlgolia = onDocumentWritten({ document: "Products/{productId}/SkuVariants/{skuVariantId}", secrets: [algoliaWriteKey] }, async (event) => {
   const productId = event.params.productId;
   const skuVariantId = event.params.skuVariantId;
   logger.info(`[Firebase] SKU variant sync triggered for product ${productId}, SKU variant ${skuVariantId}`);

   try {
      const skuVariants = await getSkuVariants(productId);
      logger.info(`[Firebase] Starting Algolia sync for SKU variants of product ${productId}`);
      await updateProductToAlgolia(productId, OPERATION_TYPE.UPDATE, undefined, undefined, skuVariants);
      logger.info(`[Firebase] Successfully completed SKU variant sync for ${productId}`);
   } catch (error: any) {
      logger.error(`[Firebase] Error in syncSkuVariantsToAlgolia for product ${productId}:`, error);
      throw error;
   }
});
