import { configureStore } from "@reduxjs/toolkit";
import cartReducer from "@/state/cart/cartSlice";
import authReducer from "@/state/auth/authSlice";
import loggerMiddleware from "@/state/middleware/logger";

// A new store is created per request on the server and once per page load in the browser (see StoreProvider)
export const makeStore = () =>
   configureStore({
      reducer: {
         auth: authReducer,
         cart: cartReducer,
      },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(loggerMiddleware),
   });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
