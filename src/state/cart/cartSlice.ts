import { CartProduct } from "@/types/product";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { addToCart } from "./actions/addToCart";

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

const cartSlice = createSlice({
   name: "cart",
   initialState,
   reducers: {
      removeItem: (state, action: PayloadAction<string>) => {
         state.cart = state.cart.filter((item) => item.id !== action.payload);
         updateTotals(state);
      },
      clearCart: (state) => {
         state.cart = [];
         updateTotals(state);
      },
      clearLocalCart: (state) => {
         state.cart = [];
         updateTotals(state);
      },
      reconstructCart: (state, action: PayloadAction<CartProduct[]>) => {
         state.cart = action.payload;
         updateTotals(state);
      },
   },
   extraReducers: (builder) => {
      builder.addCase(addToCart.pending, (state) => {
         state.isLoading = true;
      });
      builder.addCase(addToCart.fulfilled, (state, action) => {
         const index = state.cart.findIndex((item) => item.id === action.payload.id);
         if (index !== -1) {
            state.cart[index] = action.payload;
         } else {
            state.cart.push(action.payload);
         }
         updateTotals(state);
         state.isLoading = false;
      });
      builder.addCase(addToCart.rejected, (state, action) => {
         console.log(action.error);
         state.isLoading = false;
      });
   },
});

export const { removeItem, clearCart, clearLocalCart, reconstructCart } = cartSlice.actions;
export { addToCart };

export default cartSlice.reducer;
