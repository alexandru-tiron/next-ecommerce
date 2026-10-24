import { Middleware } from "@reduxjs/toolkit";

const loggerMiddleware: Middleware = (storeAPI) => (next) => (action) => {
   if (process.env.NODE_ENV !== "production") {
      // Group logs for readability in dev
      console.groupCollapsed(`[redux] ${String((action as { type?: unknown }).type)}`);
      console.log("prev state", storeAPI.getState());
      console.log("action", action);
   }

   const result = next(action);

   if (process.env.NODE_ENV !== "production") {
      console.log("next state", storeAPI.getState());
      console.groupEnd();
   }

   return result;
};

export default loggerMiddleware;
