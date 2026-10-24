import { createAsyncThunk } from "@reduxjs/toolkit";
import { collection, doc, getDoc, onSnapshot, QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebaseInit";
import { CartProduct } from "@/types/product";
import type { RootState } from "@/state/store";
import { setCart } from "../cartSlice";
import { readGuestCart, writeGuestCart } from "../guestCart";
import { addToCart, toAddToCartArgs } from "./addToCart";

// Firestore unsubscribe functions aren't serializable, so the active listener lives here instead of in the store
let unsubscribeCart: (() => void) | null = null;
// Bumped on every start and stop, so snapshots that finish loading after a logout or user switch are dropped
let syncId = 0;

export function stopCartSync() {
   syncId++;
   unsubscribeCart?.();
   unsubscribeCart = null;
}

// Logged-in users: follow the Firestore Cart subcollection and move any guest cart into it
export const syncCart = createAsyncThunk<void, string, { state: RootState }>("cart/syncCart", async (uid, { dispatch }) => {
   stopCartSync();
   const currentSyncId = syncId;
   let latestSnapshot = 0;

   unsubscribeCart = onSnapshot(
      collection(db, "Users", uid, "Cart"),
      async (snapshot) => {
         const snapshotId = ++latestSnapshot;
         const cart = await Promise.all(snapshot.docs.map(withSkuVariantPrice));
         // Skip if a newer snapshot arrived, or the user changed, while SKU prices were loading
         if (snapshotId === latestSnapshot && currentSyncId === syncId) {
            dispatch(setCart(cart));
         }
      },
      (error) => {
         console.error("Error listening to cart:", error);
      }
   );

   // Clear the guest cart before merging so a second sync (e.g. React Strict Mode) can't add it twice
   const guestCart = readGuestCart();
   writeGuestCart([]);
   for (let i = 0; i < guestCart.length; i++) {
      const result = await dispatch(addToCart(toAddToCartArgs(guestCart[i])));
      if (addToCart.rejected.match(result)) {
         // Keep what wasn't merged so the next sync can retry it
         writeGuestCart(guestCart.slice(i));
         break;
      }
   }
});

// SKU variant prices can change after an item is added, so they are read from the product each time
async function withSkuVariantPrice(item: QueryDocumentSnapshot): Promise<CartProduct> {
   const cartProduct = { id: item.id, ...item.data() } as CartProduct;
   if (cartProduct.sku_variant_id) {
      const skuSnap = await getDoc(doc(db, "Products", cartProduct.product_id, "SkuVariants", cartProduct.sku_variant_id));
      if (skuSnap.exists()) {
         cartProduct.product_price = skuSnap.data().price;
         if (skuSnap.data().discount) {
            cartProduct.discount = skuSnap.data().discount;
            cartProduct.discount_price = skuSnap.data().discount_price;
         }
      }
   }
   return cartProduct;
}
