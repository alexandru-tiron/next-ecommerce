import { describe, expect, it } from "vitest";
import { reviewerName } from "./reviewerName";

describe("reviewerName", () => {
   it("shows the first name and the initial of the last name", () => {
      expect(reviewerName("Ana", "georgescu")).toBe("Ana G.");
   });

   it("shows just the first name when there is no last name", () => {
      expect(reviewerName("Ana", "")).toBe("Ana");
   });

   it("falls back to the display name", () => {
      expect(reviewerName(undefined, undefined, "  Mihai   Popescu ")).toBe("Mihai P.");
   });

   it("falls back to the part of the e-mail before @", () => {
      expect(reviewerName(" ", null, null, "radu.m@example.com")).toBe("radu.m");
   });

   it("uses a generic name when nothing is known", () => {
      expect(reviewerName()).toBe("Customer");
   });
});
