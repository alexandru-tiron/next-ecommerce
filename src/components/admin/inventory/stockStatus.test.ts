import { describe, expect, it } from "vitest";
import { parseStockInput, stockStatus } from "./stockStatus";

describe("stockStatus", () => {
   it("classifies stock levels", () => {
      expect(stockStatus(0)).toBe("out");
      expect(stockStatus(-2)).toBe("out");
      expect(stockStatus(3)).toBe("low");
      expect(stockStatus(5)).toBe("low");
      expect(stockStatus(6)).toBe("ok");
   });

   it("treats products without a stock number as untracked", () => {
      expect(stockStatus(undefined)).toBe("untracked");
      expect(stockStatus(null)).toBe("untracked");
   });

   it("uses a custom threshold", () => {
      expect(stockStatus(8, 10)).toBe("low");
   });
});

describe("parseStockInput", () => {
   it("accepts whole numbers of zero or more", () => {
      expect(parseStockInput("0")).toBe(0);
      expect(parseStockInput(" 42 ")).toBe(42);
   });

   it("rejects negative, decimal and non-numeric values", () => {
      expect(parseStockInput("-1")).toBeNull();
      expect(parseStockInput("2.5")).toBeNull();
      expect(parseStockInput("ten")).toBeNull();
      expect(parseStockInput("")).toBeNull();
   });
});
