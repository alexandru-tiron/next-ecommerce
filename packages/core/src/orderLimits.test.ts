import { describe, expect, it } from "vitest";
import { isValidQuantity, MAX_LINE_QUANTITY } from "./orderLimits";

describe("isValidQuantity", () => {
   it("accepts whole quantities from one up to the limit", () => {
      expect(isValidQuantity(1)).toBe(true);
      expect(isValidQuantity(MAX_LINE_QUANTITY)).toBe(true);
   });

   it.each([0, -1, -5, 0.5, 1.5, MAX_LINE_QUANTITY + 1, Infinity, NaN])("rejects %s", (quantity) => {
      expect(isValidQuantity(quantity)).toBe(false);
   });

   it.each(["2", null, undefined, {}, [1]])("rejects values that aren't numbers: %j", (quantity) => {
      expect(isValidQuantity(quantity)).toBe(false);
   });
});
