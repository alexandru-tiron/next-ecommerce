import { describe, expect, it } from "vitest";
import { isValidVatRate, netOfVat, vatIncluded } from "./vat";

describe("vatIncluded", () => {
   it("extracts the VAT contained in a VAT-inclusive amount", () => {
      expect(vatIncluded(121, 21)).toBe(21);
      expect(vatIncluded(1699, 21)).toBe(294.87);
      expect(vatIncluded(25, 21)).toBe(4.34);
      expect(vatIncluded(119, 19)).toBe(19);
   });

   it("is zero for a zero or invalid rate", () => {
      expect(vatIncluded(100, 0)).toBe(0);
      expect(vatIncluded(100, Number.NaN)).toBe(0);
   });
});

describe("netOfVat", () => {
   it("returns the amount without VAT", () => {
      expect(netOfVat(121, 21)).toBe(100);
      expect(netOfVat(1699, 21)).toBe(1404.13);
   });
});

describe("isValidVatRate", () => {
   it("accepts percentages between 0 and 100", () => {
      expect(isValidVatRate(21)).toBe(true);
      expect(isValidVatRate(0)).toBe(true);
      expect(isValidVatRate(-1)).toBe(false);
      expect(isValidVatRate(101)).toBe(false);
      expect(isValidVatRate("21")).toBe(false);
   });
});
