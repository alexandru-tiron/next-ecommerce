// Largest quantity of one cart line; the Cart rule in firestore.rules uses the same limit
export const MAX_LINE_QUANTITY = 999;
// Most lines one order can have, so a single request can't make the order function read thousands of products
export const MAX_ORDER_LINES = 100;

// A quantity must be a whole number of at least one: a negative line would cancel out another line's price and put stock back
export function isValidQuantity(quantity: unknown): quantity is number {
   return typeof quantity === "number" && Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_LINE_QUANTITY;
}
