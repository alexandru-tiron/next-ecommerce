import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RULES_VERSION, rulesVersionOf } from "./rulesVersion";

describe("rules version", () => {
   it.each(["firestore.rules", "storage.rules"])("%s carries the current version marker", (file) => {
      expect(rulesVersionOf(readFileSync(file, "utf8"))).toBe(RULES_VERSION);
   });

   it("reads the marker, or null without one", () => {
      expect(rulesVersionOf("// Rules version 12 (...)")).toBe(12);
      expect(rulesVersionOf("service cloud.firestore {}")).toBeNull();
   });
});
