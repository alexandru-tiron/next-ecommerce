import { CartProduct } from "@/types/product";

// Guests keep their cart in localStorage under "myCart"; it is moved to Firestore when they log in
const GUEST_CART_KEY = "myCart";

export function readGuestCart(): CartProduct[] {
   try {
      return JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "[]");
   } catch (error) {
      console.log(error);
      return [];
   }
}

export function writeGuestCart(cart: CartProduct[]) {
   localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
}
