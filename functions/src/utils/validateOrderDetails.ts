import { logger } from "firebase-functions/v1";
import { Address, CartProduct } from "../types/order";
import { getFirestore } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { StoreErrorCode } from "@core/errors";

const db = getFirestore();

// Function to validate products against database
export async function validateProducts(
   products: CartProduct[],
   userId: string
): Promise<{
   validatedProducts: CartProduct[];
   invalidProducts: Array<{ id: string; variant_id?: string; sku_variant_id?: string; reason: StoreErrorCode }>;
}> {
   const validatedProducts: CartProduct[] = [];
   const invalidProducts: Array<{ id: string; variant_id?: string; sku_variant_id?: string; reason: StoreErrorCode }> = [];

   for (const product of products) {
      try {
         // Get product from Firestore
         const productSnap = await db.collection("Products").doc(product.product_id).get();

         if (!productSnap.exists) {
            logger.warn(`[Order] Product ${product.product_id} not found`);
            invalidProducts.push({
               id: product.product_id,
               reason: "product_missing",
            });
            continue;
         }

         const productData = productSnap.data();

         // Validate basic product info
         if (productData?.name !== product.product_name || productData?.product_code !== product.product_code) {
            logger.warn(`[Order] Product ${product.product_id} info mismatch`);
            invalidProducts.push({
               id: product.product_id,
               reason: "product_changed",
            });
            continue;
         }

         // Check for variant if present
         let variantValid = true;
         if (product.variant_id) {
            const variantSnap = await db.doc(`Products/${product.product_id}/Variants/${product.variant_id}`).get();

            if (!variantSnap.exists || variantSnap.data()?.name !== product.variant_name) {
               variantValid = false;
            }
         }

         if (!variantValid) {
            logger.warn(`[Order] Invalid variant ${product.variant_id} for product ${product.product_id}`);
            invalidProducts.push({
               id: product.product_id,
               variant_id: product.variant_id,
               reason: "variant_missing",
            });
            continue;
         }

         // Check for SKU variant if present
         let skuVariantValid = true;
         let actualPrice = product.product_price;
         let discountPrice = product.discount_price;
         let hasDiscount = product.discount || false;

         if (product.sku_variant_id) {
            const skuVariantSnap = await db.doc(`Products/${product.product_id}/SkuVariants/${product.sku_variant_id}`).get();
            let skuVariantData = skuVariantSnap.data();
            if (!skuVariantSnap.exists || skuVariantSnap.data()?.name !== product.sku_variant_name) {
               skuVariantValid = false;
            } else if (skuVariantSnap.data()?.price !== product.product_price) {
               skuVariantValid = false;
               actualPrice = skuVariantSnap.data()?.price;
            } else if (skuVariantSnap.data()?.discount && skuVariantSnap.data()?.discount_price !== product.discount_price) {
               skuVariantValid = false;
               hasDiscount = skuVariantData && Object.keys(skuVariantData).includes("discount") ? skuVariantData.discount : undefined;
               discountPrice = skuVariantSnap.data()?.discount_price;
            }
         }

         if (!skuVariantValid) {
            logger.warn(`[Order] Invalid SKU variant ${product.sku_variant_id} for product ${product.product_id}`);
            invalidProducts.push({
               id: product.product_id,
               sku_variant_id: product.sku_variant_id,
               reason: "variant_missing",
            });
            continue;
         }

         // Validate price
         const expectedPrice = hasDiscount && discountPrice ? discountPrice : actualPrice;
         const cartPrice = product.discount && product.discount_price ? product.discount_price : product.product_price;

         logger.info("Order Product expectedPrice:", expectedPrice);
         logger.info("Order Product cartPrice:", cartPrice);

         if (Math.abs(expectedPrice - cartPrice) > 0.01) {
            // Allow for small floating point differences
            logger.warn(`[Order] Price mismatch for product ${product.product_id}`);
            invalidProducts.push({
               id: product.product_id,
               reason: "price_changed",
            });
            continue;
         }
         let validProduct = {
            ...product,
            product_price: actualPrice,
            // discount: hasDiscount,
            // discount_price: hasDiscount ? discountPrice : undefined,
         };
         if (typeof hasDiscount === "boolean") {
            validProduct.discount = hasDiscount;
            if (hasDiscount) validProduct.discount_price = discountPrice;
         }
         // Product is valid, add to validated products
         validatedProducts.push(validProduct);
      } catch (error) {
         logger.error(`[Order] Error validating product ${product.product_id}:`, error);
         invalidProducts.push({
            id: product.product_id,
            reason: "product_check_failed",
         });
      }
   }

   return { validatedProducts, invalidProducts };
}

// Function to validate an address object has all required fields
export function validateAddress(address: Address | undefined, isBusinessAddress: boolean = false): boolean {
   if (!address) return false;

   // Check for required fields
   const basicFieldsValid = !!address.city?.trim() && !!address.county?.trim() && !!address.street?.trim() && !!address.street_no && !!address.postal_code;

   // If this is not required to be a business address, just return basic validation result
   if (!isBusinessAddress) {
      return basicFieldsValid;
   }

   // For business addresses, also validate business details
   return basicFieldsValid && !!address.business && !!address.business_details?.cui?.trim() && !!address.business_details?.name?.trim() && !!address.business_details?.reg_no?.trim();
}

// Function to check if a similar order exists in the last hour
export async function checkForDuplicateOrder(
   userId: string,
   products: CartProduct[]
): Promise<{
   isDuplicate: boolean;
   duplicateOrderId?: string;
}> {
   // Get orders from this user in the last hour
   const timePeriod = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago

   const recentOrdersQuery = db.collection("Orders").where("user_id", "==", userId).where("date", ">=", Timestamp.fromDate(timePeriod));

   const recentOrdersSnapshot = await recentOrdersQuery.get();

   if (recentOrdersSnapshot.empty) {
      return { isDuplicate: false };
   }

   // Check each order for matching products
   for (const orderDoc of recentOrdersSnapshot.docs) {
      const orderData = orderDoc.data();
      const orderProducts = orderData.products;

      // Check if products array has the same length first
      if (!orderProducts || orderProducts?.length !== products?.length) {
         return { isDuplicate: false };
      }

      // Check if every product in current order matches a product in the existing order
      const allProductsMatch = products.every((currentProduct) => {
         // Find a matching product in the existing order
         return orderProducts.some(
            (existingProduct: CartProduct) => existingProduct.product_id === currentProduct.product_id && existingProduct.variant_id === currentProduct.variant_id && existingProduct.sku_variant_id === currentProduct.sku_variant_id && existingProduct.quantity === currentProduct.quantity
         );
      });

      if (allProductsMatch) {
         logger.info(`[Order] Found duplicate order ${orderDoc.id} for user ${userId}`);
         return {
            isDuplicate: true,
            duplicateOrderId: orderDoc.id,
         };
      }
   }

   return { isDuplicate: false };
}
