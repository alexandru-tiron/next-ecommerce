import { describe, expect, it } from "vitest";
import { brandContrastOk, brandPalette, contrastRatio, paletteCss, SHADES } from "./brand";

describe("brandPalette", () => {
   it("keeps the picked colour and makes shades from light to dark", () => {
      const palette = brandPalette("#be185d");
      expect(palette[700]).toBe("#be185d");
      expect(Object.keys(palette).map(Number)).toEqual([...SHADES]);
      for (let i = 1; i < SHADES.length; i++) {
         expect(contrastRatio(palette[SHADES[i]], "#ffffff")).toBeGreaterThan(contrastRatio(palette[SHADES[i - 1]], "#ffffff"));
      }
   });

   it("gives valid colours for greys, very light and very dark picks", () => {
      for (const colour of ["#808080", "#fef3c7", "#0f172a", "#00ff00"]) {
         for (const value of Object.values(brandPalette(colour))) expect(value).toMatch(/^#[0-9a-f]{6}$/);
      }
   });

   it("writes CSS custom properties", () => {
      expect(paletteCss(brandPalette("#2563eb"))).toContain("--brand-50: #");
   });
});

describe("contrast", () => {
   it("follows the WCAG formula", () => {
      expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 0);
      expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 1);
   });

   it("keeps white text readable on brand-700 whatever colour is picked", () => {
      for (const colour of ["#be185d", "#2563eb", "#facc15", "#22c55e", "#f97316", "#a855f7", "#808080"]) {
         expect(brandContrastOk(colour)).toBe(true);
         expect(contrastRatio(brandPalette(colour)[700], "#ffffff")).toBeGreaterThanOrEqual(4.5);
      }
   });
});
