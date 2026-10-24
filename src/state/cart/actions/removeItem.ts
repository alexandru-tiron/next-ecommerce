import { createAsyncThunk } from "@reduxjs/toolkit";
import { deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebaseInit";
import type { RootState } from "@/state/store";
import { readGuestCart, writeGuestCart } from "../guestCart";

// Resolves with the id of the removed cart line
export const removeItem = createAsyncThunk<string, string, { state: RootState }>("cart/removeItem", async (id, { getState }) => {
   const { user } = getState().auth;
   if (user) {
      await deleteDoc(doc(db, "Users", user.uid, "Cart", id));
   } else {
      writeGuestCart(readGuestCart().filter((item) => item.id !== id));
   }
   return id;
});
