import { describe, expect, it } from "vitest";
import { AnalyticsOrder, compactNumber, inRange, kpis, niceTicks, percentChange, revenueBuckets, revenueByCategory, statusCounts, topProducts } from "./aggregate";

const day = (n: number) => new Date(2026, 9, n, 12).getTime();
const midnight = (n: number) => new Date(2026, 9, n).getTime();
const product = (id: string, price: number, quantity = 1, discountPrice?: number) => ({ product_id: id, product_name: `Product ${id}`, quantity, product_price: price, discount: discountPrice !== undefined, discount_price: discountPrice });

const orders: AnalyticsOrder[] = [
   { id: "1", date: day(1), status: "delivered", total: 125, products: [product("a", 100)] },
   { id: "2", date: day(2), status: "shipped", total: 225, products: [product("a", 100), product("b", 50, 2, 40)] },
   { id: "3", date: day(2), status: "rejected", total: 500, products: [product("c", 475)] },
   { id: "4", date: day(9), total: 75, products: [product("b", 50)] },
];

describe("kpis", () => {
   it("ignores rejected orders", () => {
      expect(kpis(orders)).toEqual({ revenue: 425, orders: 3, averageOrder: 141.67, itemsSold: 5 });
   });

   it("handles an empty period", () => {
      expect(kpis([])).toEqual({ revenue: 0, orders: 0, averageOrder: 0, itemsSold: 0 });
   });
});

describe("inRange", () => {
   it("keeps orders from the start up to (not including) the end", () => {
      expect(inRange(orders, day(2), day(9)).map((order) => order.id)).toEqual(["2", "3"]);
   });
});

describe("percentChange", () => {
   it("returns a signed percentage", () => {
      expect(percentChange(150, 100)).toBe(50);
      expect(percentChange(75, 100)).toBe(-25);
   });

   it("returns null when there is no previous value to compare with", () => {
      expect(percentChange(10, 0)).toBeNull();
      expect(percentChange(0, 0)).toBe(0);
   });
});

describe("revenueBuckets", () => {
   it("includes a partial final day when the range ends mid-day", () => {
      expect(revenueBuckets(orders, day(1), day(4), "day")).toHaveLength(4);
   });

   it("groups sales by day", () => {
      // Up to midnight before the 4th: three whole days
      const buckets = revenueBuckets(orders, day(1), midnight(4), "day");
      expect(buckets.map((bucket) => [bucket.revenue, bucket.orders])).toEqual([
         [125, 1],
         [225, 1],
         [0, 0],
      ]);
   });

   it("groups sales by week", () => {
      const buckets = revenueBuckets(orders, day(1), midnight(15), "week");
      expect(buckets.map((bucket) => bucket.revenue)).toEqual([350, 75]);
   });
});

describe("statusCounts", () => {
   it("counts every status in a fixed order, treating a missing status as pending", () => {
      expect(statusCounts(orders)).toEqual([
         { status: "pending", count: 1 },
         { status: "accepted", count: 0 },
         { status: "shipped", count: 1 },
         { status: "delivered", count: 1 },
         { status: "rejected", count: 1 },
      ]);
   });
});

describe("topProducts", () => {
   it("ranks products by revenue at the price paid", () => {
      expect(topProducts(orders)).toEqual([
         { productId: "a", name: "Product a", units: 2, revenue: 200 },
         { productId: "b", name: "Product b", units: 3, revenue: 130 },
      ]);
   });
});

describe("revenueByCategory", () => {
   it("adds up product revenue per category", () => {
      const categories: Record<string, string> = { a: "Audio", b: "Gaming" };
      expect(revenueByCategory(orders, (id) => categories[id])).toEqual([
         { category: "Audio", revenue: 200 },
         { category: "Gaming", revenue: 130 },
      ]);
   });
});

describe("compactNumber / niceTicks", () => {
   it("formats large numbers compactly", () => {
      expect(compactNumber(950)).toBe("950");
      expect(compactNumber(1284)).toBe("1.3K");
      expect(compactNumber(25400)).toBe("25K");
      expect(compactNumber(1_250_000)).toBe("1.3M");
   });

   it("picks clean axis steps that cover the maximum", () => {
      expect(niceTicks(1730)).toEqual([0, 500, 1000, 1500, 2000]);
      expect(niceTicks(0)).toEqual([0, 1]);
   });
});
