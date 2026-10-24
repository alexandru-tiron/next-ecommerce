import { logger } from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import { Variant, SkuVariant } from "../types/product";

export const getVariants = async (productId: string): Promise<Variant[]> => {
   logger.info(`[Firebase] Fetching variants for product ${productId}`);
   const variantsSnap = await getFirestore().collection(`Products/${productId}/Variants`).get();
   const variants = variantsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
   })) as Variant[];
   logger.info(`[Firebase] Found ${variants?.length} variants for product ${productId}`);
   return variants;
};

export const getSkuVariants = async (productId: string): Promise<SkuVariant[]> => {
   logger.info(`[Firebase] Fetching SKU variants for product ${productId}`);
   const skuVariantsSnap = await getFirestore().collection(`Products/${productId}/SkuVariants`).get();
   const skuVariants = skuVariantsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
   })) as SkuVariant[];
   logger.info(`[Firebase] Found ${skuVariants?.length} SKU variants for product ${productId}`);
   return skuVariants;
};
