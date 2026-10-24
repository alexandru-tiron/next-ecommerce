import { auth, db } from "@/lib/firebaseInit";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, Timestamp, writeBatch } from "firebase/firestore";
import { useSyncExternalStore } from "react";
import { readLocalWishlist, toggleId, writeLocalWishlist } from "./wishlistIds";

// One shared wishlist for the whole page: signed-in users' items live in Users/{uid}/Wishlist,
// guests' items in localStorage (moved into the account when they sign in).
// It reads the user straight from Firebase Auth, so it doesn't depend on the auth context or the Redux store.
const EMPTY: string[] = [];
let ids: string[] = EMPTY;
let user: User | null = null;
let started = false;
let unsubscribeItems: (() => void) | null = null;
const listeners = new Set<() => void>();

const emit = (next: string[]) => {
   ids = next;
   listeners.forEach((listener) => listener());
};

function start() {
   if (started) return;
   started = true;
   emit(readLocalWishlist());

   onAuthStateChanged(auth, async (current) => {
      user = current;
      unsubscribeItems?.();
      unsubscribeItems = null;
      if (!current) {
         emit(readLocalWishlist());
         return;
      }

      const local = readLocalWishlist();
      if (local.length > 0) {
         try {
            const batch = writeBatch(db);
            local.forEach((id) => batch.set(doc(db, "Users", current.uid, "Wishlist", id), { added_at: serverTimestamp() }));
            await batch.commit();
            writeLocalWishlist([]);
         } catch (error) {
            console.error("Error moving the wishlist into the account:", error);
         }
      }

      unsubscribeItems = onSnapshot(
         collection(db, "Users", current.uid, "Wishlist"),
         (snapshot) => {
            const addedAt = (value: unknown) => (value instanceof Timestamp ? value.toMillis() : Date.now());
            emit(
               snapshot.docs
                  .map((item) => ({ id: item.id, at: addedAt(item.data().added_at) }))
                  .sort((a, b) => b.at - a.at)
                  .map((item) => item.id)
            );
         },
         (error) => console.error("Error listening to the wishlist:", error)
      );
   });
}

function subscribe(listener: () => void) {
   start();
   listeners.add(listener);
   return () => {
      listeners.delete(listener);
   };
}

export async function toggleWishlist(productId: string) {
   if (!user) {
      const next = toggleId(ids, productId);
      writeLocalWishlist(next);
      emit(next);
      return;
   }
   const ref = doc(db, "Users", user.uid, "Wishlist", productId);
   if (ids.includes(productId)) await deleteDoc(ref);
   else await setDoc(ref, { added_at: serverTimestamp() });
}

export function useWishlist() {
   const list = useSyncExternalStore(
      subscribe,
      () => ids,
      () => EMPTY
   );
   return { ids: list, has: (productId: string) => list.includes(productId), toggle: toggleWishlist };
}
