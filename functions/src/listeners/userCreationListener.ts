import { FieldValue, getFirestore } from "firebase-admin/firestore";
import * as functions from "firebase-functions/v1";
import { Address } from "../types/order";
const db = getFirestore();

export const onUserCreate = functions
   .region("europe-west3")
   .auth.user()
   .onCreate(async (user) => {
      try {
         const userData = {
            email: user.email,
            created_at: FieldValue.serverTimestamp(),
         };
         return db.collection("Users").doc(user.uid).set(userData, { merge: true });
      } catch (error) {
         console.error(`User creation error: ${user.uid}`);
         throw error;
      }
   });

export const onUserDelete = functions
   .region("europe-west3")
   .auth.user()
   .onDelete(async (user) => {
      try {
         const userData = await db.collection("Users").doc(user.uid).get();
         if (userData.exists) {
            const data = userData.data();
            if (data) {
               data.deleted_at = FieldValue.serverTimestamp();
               await db.collection("DeletedUsers").doc(user.uid).set(data);
               const adresses = await db.collection("Users").doc(user.uid).collection("Addresses").get();
               for (const adress of adresses.docs) {
                  const oldAdress = adress.data() as Omit<Address, "id">;
                  await db.collection("DeletedUsers").doc(user.uid).collection("Addresses").doc(adress.id).set(oldAdress);
               }
            }
         }
         // Also removes the Addresses and Cart subcollections, which delete() would leave behind
         return db.recursiveDelete(db.collection("Users").doc(user.uid));
      } catch (error) {
         console.error(`User deletion error: ${user.uid}`);
         throw error;
      }
   });
