import { DocumentReference, FieldValue, Firestore, Transaction } from "firebase-admin/firestore";
import { storeError } from "./errors";

// Total ordered quantity per product; all variants of a product share the product's stock
export function quantitiesByProduct(products: { product_id: string; quantity: number }[]) {
   const totals = new Map<string, number>();
   for (const product of products) totals.set(product.product_id, (totals.get(product.product_id) ?? 0) + product.quantity);
   return totals;
}

// Inside the order transaction: checks there is enough stock for every product, then takes it off and counts the sale.
// Products without a numeric "stoc" aren't stock-limited. Must run before the transaction's writes.
export async function reserveStock(transaction: Transaction, db: Firestore, products: { product_id: string; quantity: number }[]) {
   const totals = quantitiesByProduct(products);
   if (totals.size === 0) return;
   const snaps = await transaction.getAll(...[...totals.keys()].map((id) => db.collection("Products").doc(id)));

   const shortages = snaps.filter((snap) => typeof snap.data()?.stoc === "number" && snap.data()!.stoc < (totals.get(snap.id) ?? 0));
   if (shortages.length > 0) {
      throw storeError("failed-precondition", "out_of_stock", { products: shortages.map((snap) => snap.data()?.name).join(", ") }, { products: shortages.map((snap) => ({ id: snap.id, available: snap.data()?.stoc })) });
   }

   for (const snap of snaps) {
      if (!snap.exists) continue;
      const quantity = totals.get(snap.id) ?? 0;
      const update: Record<string, FieldValue> = { sold: FieldValue.increment(quantity) };
      if (typeof snap.data()?.stoc === "number") update.stoc = FieldValue.increment(-quantity);
      transaction.update(snap.ref, update);
   }
}

// Puts a cancelled order's items back in stock, once. Only for orders that reserved stock when they were placed.
export async function restoreStock(db: Firestore, orderRef: DocumentReference) {
   await db.runTransaction(async (transaction) => {
      const order = await transaction.get(orderRef);
      const data = order.data();
      if (!data?.stock_reserved || data.stock_restored) return;

      const totals = quantitiesByProduct(data.products || []);
      const snaps = totals.size > 0 ? await transaction.getAll(...[...totals.keys()].map((id) => db.collection("Products").doc(id))) : [];
      for (const snap of snaps) {
         if (!snap.exists) continue;
         const quantity = totals.get(snap.id) ?? 0;
         const update: Record<string, FieldValue> = { sold: FieldValue.increment(-quantity) };
         if (typeof snap.data()?.stoc === "number") update.stoc = FieldValue.increment(quantity);
         transaction.update(snap.ref, update);
      }
      transaction.update(orderRef, { stock_restored: true });
   });
}
