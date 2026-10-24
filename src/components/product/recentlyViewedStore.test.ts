import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addRecentlyViewed, readRecentlyViewed, RECENTLY_VIEWED_KEY, saveRecentlyViewed } from "./recentlyViewedStore";

describe("addRecentlyViewed", () => {
   it("puts the product first", () => {
      expect(addRecentlyViewed(["a", "b"], "c")).toEqual(["c", "a", "b"]);
   });

   it("moves an already viewed product to the front instead of duplicating it", () => {
      expect(addRecentlyViewed(["a", "b", "c"], "b")).toEqual(["b", "a", "c"]);
   });

   it("keeps at most max ids", () => {
      expect(addRecentlyViewed(["a", "b", "c"], "d", 3)).toEqual(["d", "a", "b"]);
   });
});

describe("readRecentlyViewed / saveRecentlyViewed", () => {
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

   afterEach(() => {
      vi.unstubAllGlobals();
   });

   it("round-trips the saved ids", () => {
      saveRecentlyViewed(["x", "y"]);
      expect(readRecentlyViewed()).toEqual(["x", "y"]);
   });

   it("returns an empty list when nothing is stored", () => {
      expect(readRecentlyViewed()).toEqual([]);
   });

   it("ignores corrupt or unexpected data", () => {
      store[RECENTLY_VIEWED_KEY] = "{not json";
      expect(readRecentlyViewed()).toEqual([]);
      store[RECENTLY_VIEWED_KEY] = JSON.stringify({ ids: ["a"] });
      expect(readRecentlyViewed()).toEqual([]);
      store[RECENTLY_VIEWED_KEY] = JSON.stringify(["a", 3, null, "b"]);
      expect(readRecentlyViewed()).toEqual(["a", "b"]);
   });

   it("doesn't throw when storage is unavailable", () => {
      vi.stubGlobal("localStorage", {
         getItem: () => {
            throw new Error("blocked");
         },
         setItem: () => {
            throw new Error("blocked");
         },
      });
      expect(readRecentlyViewed()).toEqual([]);
      expect(() => saveRecentlyViewed(["a"])).not.toThrow();
   });
});
