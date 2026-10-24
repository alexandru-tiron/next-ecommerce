import type { SearchParams } from "@/types/product";

// Filters that allow several values; the URL keeps them as comma-separated lists, e.g. ?brand=Apple,Samsung
export const MULTI_VALUE_FILTERS = {
   brand: "brand",
   size: "sku_variants.name",
   colour: "variants.name",
} as const;
export type MultiValueFilter = keyof typeof MULTI_VALUE_FILTERS;

export const listParam = (value?: string) =>
   value
      ? value
           .split(",")
           .map((item) => item.trim())
           .filter(Boolean)
      : [];

// Adds the value to a comma-separated list, or removes it when it is already there
export const toggleListValue = (value: string | undefined, item: string) => {
   const list = listParam(value);
   return (list.includes(item) ? list.filter((current) => current !== item) : [...list, item]).join(",");
};

const quote = (value: string) => `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
const numberParam = (value?: string) => (value && value.trim() !== "" && Number.isFinite(Number(value)) ? Number(value) : undefined);

// Algolia filter string for the product list. `except` leaves one multi-value filter out, which is
// how the sidebar gets counts for every option of that facet (disjunctive faceting).
export function buildFilters(params: SearchParams, except?: MultiValueFilter): string | undefined {
   const conditions: string[] = [];
   if (params.cat) conditions.push(`category_name:${quote(params.cat)}`);
   if (params.subcat) conditions.push(`subcategory_name:${quote(params.subcat)}`);

   for (const [key, attribute] of Object.entries(MULTI_VALUE_FILTERS) as [MultiValueFilter, string][]) {
      if (key === except) continue;
      const values = listParam(params[key]);
      if (values.length > 0) conditions.push(`(${values.map((value) => `${attribute}:${quote(value)}`).join(" OR ")})`);
   }

   // Parsed as numbers so a crafted URL can't inject other filters
   const min = numberParam(params.min);
   const max = numberParam(params.max);
   if (min !== undefined) conditions.push(`price >= ${min}`);
   if (max !== undefined) conditions.push(`price <= ${max}`);
   if (params.stock === "1") conditions.push("stoc > 0");
   if (params.sale === "1") conditions.push("discount:true");

   return conditions.length > 0 ? conditions.join(" AND ") : undefined;
}

// Sorts facet values like "128 GB", "1 TB", "256 GB" by their size instead of alphabetically
export function compareSizes(a: string, b: string) {
   const bytes = (size: string) => {
      const match = size.match(/([\d.]+)\s*(TB|GB|MB)/i);
      if (!match) return Number.NaN;
      return Number(match[1]) * { TB: 1_000_000, GB: 1_000, MB: 1 }[match[2].toUpperCase() as "TB" | "GB" | "MB"];
   };
   const [sizeA, sizeB] = [bytes(a), bytes(b)];
   if (!Number.isNaN(sizeA) && !Number.isNaN(sizeB) && sizeA !== sizeB) return sizeA - sizeB;
   if (Number.isNaN(sizeA) !== Number.isNaN(sizeB)) return Number.isNaN(sizeA) ? 1 : -1;
   return a.localeCompare(b);
}
