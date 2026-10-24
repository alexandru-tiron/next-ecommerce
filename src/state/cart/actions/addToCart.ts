import { createAsyncThunk } from "@reduxjs/toolkit";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { v4 } from "uuid";
import { db } from "@/lib/firebaseInit";
import { CartProduct } from "@/types/product";
import type { RootState } from "@/state/store";

export type AddToCartArgs = Omit<CartProduct, "id" | "discount" | "discount_price">;

const isSameItem = (item: CartProduct, args: AddToCartArgs) => item.product_id === args.product_id && item.variant_id === args.variant_id && item.sku_variant_id === args.sku_variant_id;

export const addToCart = createAsyncThunk<CartProduct, AddToCartArgs, { state: RootState }>("cart/addToCart", async (args, { getState }) => {
   const { user } = getState().auth;
   const cartItems: CartProduct[] = user
      ? (await getDocs(collection(db, "Users", user.uid, "Cart"))).docs.map((item) => ({ id: item.id, ...item.data() }) as CartProduct)
      : JSON.parse(localStorage.getItem("myCart") || "[]");
   const existingItem = cartItems.find((item) => isSameItem(item, args));

   let cartProduct: CartProduct;
   if (existingItem) {
      cartProduct = { ...existingItem, quantity: existingItem.quantity + args.quantity };
      if (user) {
         await updateDoc(doc(db, "Users", user.uid, "Cart", existingItem.id), { quantity: cartProduct.quantity });
      }
   } else {
      const { variant_id, variant_name, sku_variant_id, sku_variant_name, ...product } = args;
      cartProduct = { id: user ? doc(collection(db, "Users", user.uid, "Cart")).id : v4(), ...product };
      if (variant_id) {
         cartProduct.variant_id = variant_id;
         cartProduct.variant_name = variant_name;
      }
      if (sku_variant_id) {
         cartProduct.sku_variant_id = sku_variant_id;
         cartProduct.sku_variant_name = sku_variant_name;
         // Get SKU variant price from the product
         const skuSnap = await getDoc(doc(db, "Products", args.product_id, "SkuVariants", sku_variant_id));
         if (skuSnap.exists()) {
            cartProduct.product_price = skuSnap.data().price;
            if (skuSnap.data().discount) {
               cartProduct.discount = skuSnap.data().discount;
               cartProduct.discount_price = skuSnap.data().discount_price;
            }
         }
      }
      if (user) {
         const { id, ...data } = cartProduct;
         await setDoc(doc(db, "Users", user.uid, "Cart", id), data);
      }
   }

   if (!user) {
      // Guests keep their cart in localStorage, under the same key CartContext uses
      const nextCart = existingItem ? cartItems.map((item) => (item.id === cartProduct.id ? cartProduct : item)) : [...cartItems, cartProduct];
      localStorage.setItem("myCart", JSON.stringify(nextCart));
   }

   return cartProduct;
});
