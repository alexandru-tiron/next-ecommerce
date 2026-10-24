import { CartProduct } from "@/types/product";
import { createSlice, isFulfilled, isPending, isRejected, PayloadAction } from "@reduxjs/toolkit";
import { addToCart } from "./actions/addToCart";
import { clearCart } from "./actions/clearCart";
import { reconstructCart } from "./actions/reconstructCart";
import { removeItem } from "./actions/removeItem";

interface CartState {
   cart: CartProduct[];
   isLoading: boolean;
   counter: number;
   subTotal: number;
}

const initialState: CartState = {
   cart: [],
   isLoading: false,
   counter: 0,
   subTotal: 0,
};

function updateTotals(state: CartState) {
   const subtotal = state.cart.reduce((acc, cur) => acc + (cur.discount_price ?? cur.product_price) * cur.quantity, 0);
   state.subTotal = Number(subtotal.toFixed(2));
   state.counter = state.cart.reduce((acc, cur) => acc + cur.quantity, 0);
}

const cartActions = [addToCart, removeItem, clearCart] as const;

const cartSlice = createSlice({
   name: "cart",
   initialState,
   reducers: {
      // Replaces the whole cart: the Firestore listener for logged-in users, localStorage for guests
      setCart: (state, action: PayloadAction<CartProduct[]>) => {
         state.cart = action.payload;
         updateTotals(state);
      },
   },
   extraReducers: (builder) => {
      builder.addCase(addToCart.fulfilled, (state, action) => {
         const index = state.cart.findIndex((item) => item.id === action.payload.id);
         if (index !== -1) {
            state.cart[index] = action.payload;
         } else {
            state.cart.push(action.payload);
         }
         updateTotals(state);
      });
      builder.addCase(removeItem.fulfilled, (state, action) => {
         state.cart = state.cart.filter((item) => item.id !== action.payload);
         updateTotals(state);
      });
      builder.addCase(clearCart.fulfilled, (state) => {
         state.cart = [];
         updateTotals(state);
      });
      builder.addMatcher(isPending(...cartActions), (state) => {
         state.isLoading = true;
      });
      builder.addMatcher(isFulfilled(...cartActions), (state) => {
         state.isLoading = false;
      });
      builder.addMatcher(isRejected(...cartActions), (state, action) => {
         console.log(action.error);
         state.isLoading = false;
      });
   },
});

export const { setCart } = cartSlice.actions;
export { addToCart, removeItem, clearCart, reconstructCart };

export default cartSlice.reducer;
