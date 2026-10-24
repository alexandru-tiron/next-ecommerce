import { createAsyncThunk } from "@reduxjs/toolkit";
import { collection, getDocs, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebaseInit";
import type { RootState } from "@/state/store";
import { writeGuestCart } from "../guestCart";

export const clearCart = createAsyncThunk<void, void, { state: RootState }>("cart/clearCart", async (_, { getState }) => {
   const { user } = getState().auth;
   if (user) {
      // For logged-in users, delete all items from the Cart subcollection
      const cartSnapshot = await getDocs(collection(db, "Users", user.uid, "Cart"));
      const batch = writeBatch(db);
      cartSnapshot.docs.forEach((item) => batch.delete(item.ref));
      await batch.commit();
   } else {
      writeGuestCart([]);
   }
});
