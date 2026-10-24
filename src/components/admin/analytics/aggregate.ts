// Pure aggregations behind the admin analytics page. Rejected orders don't count towards sales.
export type AnalyticsOrder = {
   id: string;
   date: number; // ms since epoch
   status?: string;
   total: number;
   user_id?: string;
   products: { product_id: string; product_name: string; quantity: number; product_price: number; discount?: boolean; discount_price?: number }[];
};

export const ORDER_STATUSES = ["pending", "accepted", "shipped", "delivered", "rejected"] as const;
const DAY = 24 * 60 * 60 * 1000;
const round2 = (value: number) => Math.round(value * 100) / 100;

export const isSale = (order: AnalyticsOrder) => order.status !== "rejected";
export const unitPrice = (product: AnalyticsOrder["products"][number]) => (product.discount && product.discount_price ? product.discount_price : product.product_price);

export function inRange(orders: AnalyticsOrder[], from: number, to: number) {
   return orders.filter((order) => order.date >= from && order.date < to);
}

export function kpis(orders: AnalyticsOrder[]) {
   const sales = orders.filter(isSale);
   const revenue = round2(sales.reduce((acc, order) => acc + order.total, 0));
   return {
      revenue,
      orders: sales.length,
      averageOrder: sales.length > 0 ? round2(revenue / sales.length) : 0,
      itemsSold: sales.reduce((acc, order) => acc + order.products.reduce((sum, product) => sum + product.quantity, 0), 0),
   };
}

// Signed % change from the previous period; null when there is nothing to compare with
export function percentChange(current: number, previous: number) {
   if (previous === 0) return current === 0 ? 0 : null;
   return Math.round(((current - previous) / previous) * 1000) / 10;
}

export const startOfDay = (ms: number) => {
   const date = new Date(ms);
   return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

// Revenue and order count per day or per week (weeks start on the first day of the range)
export function revenueBuckets(orders: AnalyticsOrder[], from: number, to: number, bucket: "day" | "week") {
   const size = bucket === "day" ? DAY : 7 * DAY;
   const start = startOfDay(from);
   const count = Math.max(1, Math.ceil((to - start) / size));
   const buckets = Array.from({ length: count }, (_, index) => ({ start: start + index * size, revenue: 0, orders: 0 }));
   for (const order of orders.filter(isSale)) {
      const index = Math.floor((order.date - start) / size);
      if (index < 0 || index >= count) continue;
      buckets[index].revenue = round2(buckets[index].revenue + order.total);
      buckets[index].orders += 1;
   }
   return buckets;
}

export function statusCounts(orders: AnalyticsOrder[]) {
   return ORDER_STATUSES.map((status) => ({ status, count: orders.filter((order) => (order.status || "pending") === status).length }));
}

export function topProducts(orders: AnalyticsOrder[], limit = 10) {
   const totals = new Map<string, { productId: string; name: string; units: number; revenue: number }>();
   for (const order of orders.filter(isSale)) {
      for (const product of order.products) {
         const entry = totals.get(product.product_id) ?? { productId: product.product_id, name: product.product_name, units: 0, revenue: 0 };
         entry.units += product.quantity;
         entry.revenue = round2(entry.revenue + unitPrice(product) * product.quantity);
         totals.set(product.product_id, entry);
      }
   }
   return [...totals.values()].sort((a, b) => b.revenue - a.revenue || b.units - a.units).slice(0, limit);
}

// Products revenue per category (before shipping and vouchers); unknown products go under `fallback`
export function revenueByCategory(orders: AnalyticsOrder[], categoryOf: (productId: string) => string | undefined, fallback = "—") {
   const totals = new Map<string, number>();
   for (const order of orders.filter(isSale)) {
      for (const product of order.products) {
         const category = categoryOf(product.product_id) ?? fallback;
         totals.set(category, round2((totals.get(category) ?? 0) + unitPrice(product) * product.quantity));
      }
   }
   return [...totals.entries()].map(([category, revenue]) => ({ category, revenue })).sort((a, b) => b.revenue - a.revenue);
}

// 1284 -> "1.3K", 25400 -> "25K", 1250000 -> "1.3M"
export function compactNumber(value: number) {
   const abs = Math.abs(value);
   if (abs >= 1_000_000) return `${round1(value / 1_000_000)}M`;
   if (abs >= 1_000) return `${round1(value / 1_000)}K`;
   return String(Math.round(value));
}
const round1 = (value: number) => (Math.abs(value) >= 10 ? Math.round(value) : Math.round(value * 10) / 10).toString();

// Clean axis ticks from 0 to just above max, e.g. max 1730 -> [0, 500, 1000, 1500, 2000]
export function niceTicks(max: number, count = 4) {
   if (max <= 0) return [0, 1];
   const raw = max / count;
   const magnitude = 10 ** Math.floor(Math.log10(raw));
   const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((candidate) => candidate >= raw) ?? 10 * magnitude;
   return Array.from({ length: Math.ceil(max / step) + 1 }, (_, index) => round2(index * step));
}
