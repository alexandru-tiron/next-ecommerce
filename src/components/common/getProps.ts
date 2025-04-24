import { doc, getDocFromCache, getDocFromServer } from "firebase/firestore";
import { db } from "@/lib/firebaseInit";
import { Info, Notifications, Shipping } from "@/types/user";

export async function getInfo(): Promise<Info | null> {
   const querySnapshot = await getDocFromCache(doc(db, "Settings", "Info")).catch(() => getDocFromServer(doc(db, "Settings", "Info")));
   return querySnapshot.exists() ? (querySnapshot.data() as Info) : null;
};
export async function getNotifications(): Promise<Notifications | null> {
   const querySnapshot = await getDocFromCache(doc(db, "Settings", "Notifications")).catch(() => getDocFromServer(doc(db, "Settings", "Notifications")));
   return querySnapshot.exists() ? (querySnapshot.data() as Notifications) : null;
};
export async function getShipping(): Promise<Shipping | null> {
   const querySnapshot = await getDocFromCache(doc(db, "Settings", "Shipping")).catch(() => getDocFromServer(doc(db, "Settings", "Shipping")));
   return querySnapshot.exists() ? (querySnapshot.data() as Shipping) : null;
};
