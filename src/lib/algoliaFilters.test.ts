import { describe, expect, it } from "vitest";
import { buildFilters, compareSizes, listParam, toggleListValue } from "./algoliaFilters";

describe("listParam / toggleListValue", () => {
   it("splits comma-separated values and ignores blanks", () => {
      expect(listParam("Apple, Samsung,,")).toEqual(["Apple", "Samsung"]);
      expect(listParam(undefined)).toEqual([]);
   });

   it("adds a value that isn't selected and removes one that is", () => {
      expect(toggleListValue("Apple", "Samsung")).toBe("Apple,Samsung");
      expect(toggleListValue("Apple,Samsung", "Apple")).toBe("Samsung");
      expect(toggleListValue(undefined, "Sony")).toBe("Sony");
   });
});

describe("buildFilters", () => {
   it("returns undefined when nothing is selected", () => {
      expect(buildFilters({})).toBeUndefined();
   });

   it("combines category, multi-value facets, price, stock and sale filters", () => {
      expect(buildFilters({ cat: "Gaming", brand: "Sony,Microsoft", size: "1 TB", min: "100", max: "3000", stock: "1", sale: "1" })).toBe(
         "category_name:'Gaming' AND (brand:'Sony' OR brand:'Microsoft') AND (sku_variants.name:'1 TB') AND price >= 100 AND price <= 3000 AND stoc > 0 AND discount:true"
      );
   });

   it("leaves out the excluded facet so its option counts can be computed", () => {
      expect(buildFilters({ brand: "Sony", colour: "Black" }, "brand")).toBe("(variants.name:'Black')");
   });

   it("escapes quotes in values", () => {
      expect(buildFilters({ brand: "O'Neill" })).toBe("(brand:'O\\'Neill')");
   });

   it("ignores price values that aren't numbers, so they can't inject filters", () => {
      expect(buildFilters({ min: "0 OR brand:'x'", max: "abc" })).toBeUndefined();
   });
});

describe("compareSizes", () => {
   it("orders storage sizes by capacity, with other labels after them", () => {
      expect(["1 TB", "Digital Edition", "128 GB", "512 GB", "256 GB"].sort(compareSizes)).toEqual(["128 GB", "256 GB", "512 GB", "1 TB", "Digital Edition"]);
   });
});
