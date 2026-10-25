import { brandPalette, paletteCss } from "@core/brand";
import { Branding, Font, Radius } from "@core/settings";

export const FONT_STACKS: Record<Font, string> = {
   inter: "var(--font-inter)",
   poppins: "var(--font-poppins)",
   lora: "var(--font-lora)",
   system: '-apple-system, "Segoe UI", Roboto, Helvetica, Arial',
};

export const RADIUS_SCALE: Record<Radius, number> = { none: 0, small: 0.5, medium: 1, large: 1.75 };

// The CSS custom properties globals.css reads for colours, corners and the font (set on :root by the root layout,
// and on the preview in Admin → Settings → Branding)
export function brandingCss(branding: Branding) {
   return `:root { ${paletteCss(brandPalette(branding.brand_color))} --store-radius: ${RADIUS_SCALE[branding.radius]}; --store-font: ${FONT_STACKS[branding.font]}; }`;
}
