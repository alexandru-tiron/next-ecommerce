import { describe, expect, it } from "vitest";
import { completedStep } from "./orderStatus";

describe("completedStep", () => {
   it("maps each order status to its step in the timeline", () => {
      expect(completedStep("pending")).toBe(0);
      expect(completedStep("accepted")).toBe(1);
      expect(completedStep("shipped")).toBe(2);
      expect(completedStep("delivered")).toBe(3);
   });

   it("treats an order without a status as just placed", () => {
      expect(completedStep(undefined)).toBe(0);
   });

   it("returns -1 for statuses that aren't on the timeline", () => {
      expect(completedStep("rejected")).toBe(-1);
   });
});
