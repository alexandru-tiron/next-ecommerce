// Turns the one brand colour an owner picks into the brand-50 … brand-950 shades the store's styles use,
// and checks text on it stays readable (WCAG AA: a contrast ratio of at least 4.5).

export const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type Shade = (typeof SHADES)[number];
export type Palette = Record<Shade, string>;

// Lightness and relative chroma of each shade, taken from Tailwind's palettes (OKLCH)
const LIGHTNESS = [0.971, 0.948, 0.899, 0.823, 0.718, 0.656, 0.592, 0.525, 0.459, 0.408, 0.284];
const CHROMA = [0.056, 0.112, 0.245, 0.45, 0.78, 0.97, 1, 0.9, 0.75, 0.61, 0.44];

type Rgb = [number, number, number];

const toLinear = (channel: number) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
const fromLinear = (channel: number) => (channel <= 0.0031308 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055);

function hexToRgb(hex: string): Rgb {
   const value = parseInt(hex.replace("#", ""), 16);
   return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

function rgbToHex(rgb: Rgb) {
   return `#${rgb.map((channel) => Math.round(Math.min(Math.max(channel, 0), 1) * 255).toString(16).padStart(2, "0")).join("")}`;
}

function rgbToOklch([r, g, b]: Rgb): [number, number, number] {
   const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];
   const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
   const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
   const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
   const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
   const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
   const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
   return [L, Math.hypot(a, bb), Math.atan2(bb, a)];
}

function oklchToLinearRgb(L: number, C: number, h: number): Rgb {
   const a = C * Math.cos(h);
   const b = C * Math.sin(h);
   const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
   const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
   const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
   return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}

// The colour at this lightness and hue, with chroma reduced until it fits in sRGB
function oklchToHex(L: number, C: number, h: number) {
   let chroma = C;
   for (let i = 0; i < 30; i++) {
      const rgb = oklchToLinearRgb(L, chroma, h);
      if (rgb.every((channel) => channel >= -0.0005 && channel <= 1.0005)) return rgbToHex(rgb.map(fromLinear) as Rgb);
      chroma *= 0.92;
   }
   return rgbToHex(oklchToLinearRgb(L, 0, h).map(fromLinear) as Rgb);
}

// Tailwind's pink, which the store was designed with, kept exact for the default brand colour
const DEFAULT_PALETTE: Palette = {
   50: "#fdf2f8",
   100: "#fce7f3",
   200: "#fbcfe8",
   300: "#f9a8d4",
   400: "#f472b6",
   500: "#ec4899",
   600: "#db2777",
   700: "#be185d",
   800: "#9d174d",
   900: "#831843",
   950: "#500724",
};

export function brandPalette(hex: string): Palette {
   if (hex.toLowerCase() === DEFAULT_PALETTE[700]) return { ...DEFAULT_PALETTE };
   const [L, C, h] = rgbToOklch(hexToRgb(hex));
   // The picked colour keeps its exact value at the shade closest to its lightness
   const anchor = LIGHTNESS.reduce((best, value, index) => (Math.abs(value - L) < Math.abs(LIGHTNESS[best] - L) ? index : best), 0);
   const maxChroma = C / CHROMA[anchor];
   return Object.fromEntries(SHADES.map((shade, index) => [shade, index === anchor ? hex.toLowerCase() : oklchToHex(LIGHTNESS[index], maxChroma * CHROMA[index], h)])) as Palette;
}

function luminance(hex: string) {
   const [r, g, b] = hexToRgb(hex).map(toLinear);
   return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(first: string, second: string) {
   const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
   return (light + 0.05) / (dark + 0.05);
}

// Buttons and links use brand-700 with white text, and brand-700 text on white
export function brandContrastOk(hex: string) {
   return contrastRatio(brandPalette(hex)[700], "#ffffff") >= 4.5;
}

// CSS custom properties for a palette, e.g. "--brand-500: #ec4899;"
export function paletteCss(palette: Palette) {
   return SHADES.map((shade) => `--brand-${shade}: ${palette[shade]};`).join(" ");
}
