import { Product, SkuVariant, Variant } from "../types/product";
import { logger } from "firebase-functions/v2";
import { defineString } from "firebase-functions/params";
import algoliasearch from "algoliasearch";
const algoliaAppId = defineString("ALGOLIA_APP_ID");
const algoliaApiKey = defineString("ALGOLIA_API_WRITE_KEY");
const algoliaIndexName = defineString("ALGOLIA_INDEX_NAME", { default: "products" });

const getIndex = () => {
   try {
      const appId = algoliaAppId.value();
      const apiKey = algoliaApiKey.value();
      const indexName = algoliaIndexName.value();

      if (!appId || !apiKey) {
         throw new Error("Algolia credentials not properly configured");
      }

      const client = algoliasearch(appId, apiKey);
      return client.initIndex(indexName);
   } catch (error) {
      logger.error("[Algolia] Failed to initialize Algolia client:", error);
      throw error;
   }
};

export enum OPERATION_TYPE {
   CREATE = "create",
   UPDATE = "update",
   DELETE = "delete",
}

export const updateProductToAlgolia = async (productId: string, operation: OPERATION_TYPE, product?: Partial<Product> | Product, variants?: Variant[], skuVariants?: SkuVariant[]) => {
   logger.info(`[Algolia Update] Starting update for product ${productId} with operation ${operation}`);
   logger.info(
      `[Algolia Update] Input data:`,
      JSON.stringify({
         product: product ? product : false,
         variants: variants ? variants : false,
         skuVariants: skuVariants ? skuVariants : false,
      })
   );

   try {
      let algoliaProduct: any;
      if (product) {
         logger.info(`[Algolia Update] Building product object for ${productId}`);
         algoliaProduct = {
            objectID: productId,
            ...product,
         };
      } else if (variants) {
         logger.info(`[Algolia Update] Building variants-only object for ${productId}`);
         algoliaProduct = {
            objectID: productId,
            variants: variants,
         };
      } else if (skuVariants) {
         logger.info(`[Algolia Update] Building SKU variants-only object for ${productId}`);
         algoliaProduct = {
            objectID: productId,
            sku_variants: skuVariants,
         };
      }

      if (!algoliaProduct && operation !== OPERATION_TYPE.DELETE) {
         logger.error(`[Algolia Update] No valid data provided for product ${productId}`);
         throw new Error("No valid data provided for Algolia update");
      }

      const index = getIndex();
      logger.info(`[Algolia Update] Executing ${operation} operation for ${productId}`);
      switch (operation) {
         case OPERATION_TYPE.CREATE:
            await index.saveObject(algoliaProduct);
            logger.info(`[Algolia Update] Successfully created product ${productId}`);
            break;
         case OPERATION_TYPE.UPDATE:
            await index.partialUpdateObject(algoliaProduct);
            logger.info(`[Algolia Update] Successfully updated product ${productId}`);
            break;
         case OPERATION_TYPE.DELETE:
            await index.deleteObject(productId);
            logger.info(`[Algolia Update] Successfully deleted product ${productId}`);
            break;
         default:
            logger.error(`[Algolia Update] Invalid operation type: ${operation} for product ${productId}`);
            throw new Error(`Invalid operation type: ${operation}`);
      }
   } catch (error) {
      logger.error(`[Algolia Update] Error processing product ${productId}:`, error);
      throw error;
   }
};
