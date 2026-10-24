export const LOW_STOCK_THRESHOLD = 5;

export type StockStatus = "out" | "low" | "ok" | "untracked";

// Products without a stock number aren't limited (the order function doesn't check them either)
export function stockStatus(stoc: number | undefined | null, threshold = LOW_STOCK_THRESHOLD): StockStatus {
   if (typeof stoc !== "number") return "untracked";
   if (stoc <= 0) return "out";
   if (stoc <= threshold) return "low";
   return "ok";
}

// A stock value typed by an admin: a whole number of zero or more, or null when it isn't valid
export function parseStockInput(value: string): number | null {
   if (!/^\d+$/.test(value.trim())) return null;
   return Number(value.trim());
}
