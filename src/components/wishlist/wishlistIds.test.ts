import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readLocalWishlist, toggleId, WISHLIST_KEY, writeLocalWishlist } from "./wishlistIds";

describe("toggleId", () => {
   it("adds a new product to the front", () => {
      expect(toggleId(["a", "b"], "c")).toEqual(["c", "a", "b"]);
   });

   it("removes a product that is already saved", () => {
      expect(toggleId(["a", "b", "c"], "b")).toEqual(["a", "c"]);
   });
});

describe("local wishlist storage", () => {
   let store: Record<string, string>;

   beforeEach(() => {
      store = {};
      vi.stubGlobal("localStorage", {
         getItem: (key: string) => store[key] ?? null,
         setItem: (key: string, value: string) => {
            store[key] = value;
         },
      });
   });

   afterEach(() => vi.unstubAllGlobals());

   it("round-trips the saved ids", () => {
      writeLocalWishlist(["x", "y"]);
      expect(readLocalWishlist()).toEqual(["x", "y"]);
   });

   it("ignores corrupt data", () => {
      store[WISHLIST_KEY] = "not json";
      expect(readLocalWishlist()).toEqual([]);
      store[WISHLIST_KEY] = JSON.stringify(["a", 1, "b"]);
      expect(readLocalWishlist()).toEqual(["a", "b"]);
   });
});
