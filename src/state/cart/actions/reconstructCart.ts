import { createAsyncThunk } from "@reduxjs/toolkit";
import { CartProduct } from "@/types/product";
import type { RootState } from "@/state/store";
import { addToCart, toAddToCartArgs } from "./addToCart";
import { clearCart } from "./clearCart";

// Replaces the cart with the given products, e.g. after checkout rejects some of them
export const reconstructCart = createAsyncThunk<void, CartProduct[], { state: RootState }>("cart/reconstructCart", async (products, { dispatch }) => {
   await dispatch(clearCart());
   for (const product of products) {
      await dispatch(addToCart(toAddToCartArgs(product)));
   }
});
