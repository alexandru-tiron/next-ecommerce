import { describe, expect, it } from "vitest";
import { cardPrice, productPath } from "./productUrl";

describe("productPath", () => {
   it("turns spaces into dashes and keeps the id in the query string", () => {
      expect(productPath({ id: "abc123", name: "  Premium Headphones X2 " })).toBe("/product/Premium-Headphones-X2?id=abc123");
   });

   it("encodes characters that aren't safe in a path segment", () => {
      expect(productPath({ id: "p1", name: "Cască 50/50" })).toBe("/product/Casc%C4%83-50%2F50?id=p1");
   });
});

describe("cardPrice", () => {
   it("uses the product price when there are no SKU variants", () => {
      expect(cardPrice({ price: 129.9 })).toEqual({ price: ["129", "90"], discount: undefined, fromPrice: false });
   });

   it("includes the discount price and keeps leading zeros in the cents", () => {
      expect(cardPrice({ price: 100, discount_price: 79.05 })).toEqual({ price: ["100", "00"], discount: ["79", "05"], fromPrice: false });
   });

   it("uses the cheapest SKU variant and marks it as a 'from' price", () => {
      const product = { price: 10, sku_variants: [{ price: 45 }, { price: 19.99, discount_price: 15.25 }, { price: 30 }] };
      expect(cardPrice(product)).toEqual({ price: ["19", "99"], discount: ["15", "25"], fromPrice: true });
   });

   it("doesn't reorder the SKU variants it is given", () => {
      const skuVariants = [{ price: 45 }, { price: 19.99 }];
      cardPrice({ price: 10, sku_variants: skuVariants });
      expect(skuVariants.map((sku) => sku.price)).toEqual([45, 19.99]);
   });

   it("falls back to zero when the price is missing", () => {
      expect(cardPrice({}).price).toEqual(["0", "00"]);
   });
});
