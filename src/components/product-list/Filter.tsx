"use client";

import { Category, SearchParams } from "@/types/product";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { client } from "@/lib/algoliaClient";
import type { SearchResponse } from "@algolia/client-search";
import { ChevronDown, Filter as FilterIcon, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { getCategData } from "@/queries";
import { buildFilters, compareSizes, listParam, MULTI_VALUE_FILTERS, MultiValueFilter, toggleListValue } from "@/lib/algoliaFilters";
// Custom checkboxes style
const customCheckboxStyles = `
   appearance-none
   w-4 h-4
   border border-gray-300
   rounded
   checked:bg-pink-700
   checked:border-pink-700
   checked:hover:bg-pink-700
   hover:border-gray-400
   transition-colors
   cursor-pointer
   relative
   shrink-0
   after:content-['']
   after:w-[6px]
   after:h-[8px]
   after:border-white
   after:border-b-2
   after:border-r-2
   after:absolute
   after:top-[2px]
   after:left-[4px]
   after:opacity-0
   after:rotate-45
   checked:after:opacity-100
`;

type FacetCounts = Record<MultiValueFilter, [string, number][]>;
const FILTER_KEYS = ["cat", "subcat", "brand", "size", "colour", "min", "max", "stock", "sale"] as const;

// Builds the URL for new filter values; any filter change goes back to the first page of results
export function useFilterNavigation() {
   const pathname = usePathname();
   const searchParams = useSearchParams();
   const router = useRouter();
   return (changes: Record<string, string | undefined>) => {
      const newParams = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(changes)) {
         if (value) newParams.set(key, value);
         else newParams.delete(key);
      }
      newParams.delete("page");
      router.push(`${pathname}?${newParams.toString()}`);
   };
}

export const hasActiveFilters = (params: SearchParams) => FILTER_KEYS.some((key) => Boolean(params[key]));

const Filter = ({ params }: { params: SearchParams }) => {
   const t = useTranslations("ProductList");
   const navigate = useFilterNavigation();
   const [categ, setCateg] = useState<Category[]>([]);
   const [isOpen, setIsOpen] = useState(false);
   const [facets, setFacets] = useState<FacetCounts>({ brand: [], size: [], colour: [] });
   const [minPrice, setMinPrice] = useState(params.min ?? "");
   const [maxPrice, setMaxPrice] = useState(params.max ?? "");
   const [expandedSections, setExpandedSections] = useState({
      price: Boolean(params.min || params.max),
      category: true,
      subcategory: Boolean(params.subcat),
      brand: true,
      size: Boolean(params.size),
      colour: Boolean(params.colour),
      availability: Boolean(params.stock || params.sale),
   });

   useEffect(() => {
      getCategData().then(setCateg);
   }, []);

   // Option counts for each multi-value facet, computed without that facet's own selection
   useEffect(() => {
      const keys = Object.keys(MULTI_VALUE_FILTERS) as MultiValueFilter[];
      client
         .search({
            requests: keys.map((key) => ({
               indexName: "products",
               query: params.name || "",
               filters: buildFilters(params, key),
               facets: [MULTI_VALUE_FILTERS[key]],
               maxValuesPerFacet: 100,
               hitsPerPage: 0,
            })),
         })
         .then(({ results }) => {
            const counts = {} as FacetCounts;
            keys.forEach((key, index) => {
               const values = Object.entries((results[index] as SearchResponse).facets?.[MULTI_VALUE_FILTERS[key]] ?? {});
               counts[key] = key === "size" ? values.sort(([a], [b]) => compareSizes(a, b)) : values.sort(([a, countA], [b, countB]) => countB - countA || a.localeCompare(b));
            });
            setFacets(counts);
         })
         .catch((error) => console.error("Error fetching filter options:", error));
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [params.name, params.cat, params.subcat, params.brand, params.size, params.colour, params.min, params.max, params.stock, params.sale]);

   // Keep the price inputs in sync with the URL (e.g. after "Clear all")
   useEffect(() => {
      setMinPrice(params.min ?? "");
      setMaxPrice(params.max ?? "");
   }, [params.min, params.max]);

   // Apply typed prices once the visitor stops typing
   useEffect(() => {
      if ((params.min ?? "") === minPrice && (params.max ?? "") === maxPrice) return;
      const timer = setTimeout(() => navigate({ min: minPrice, max: maxPrice }), 700);
      return () => clearTimeout(timer);
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [minPrice, maxPrice]);

   const toggleSection = (section: keyof typeof expandedSections) => {
      setExpandedSections((prev) => ({
         ...prev,
         [section]: !prev[section],
      }));
   };

   const section = (key: keyof typeof expandedSections, title: string, content: React.ReactNode) => (
      <div className="border-b border-gray-100">
         <button className="flex items-center justify-between w-full py-2" onClick={() => toggleSection(key)}>
            <span className=" font-semibold">{title}</span>
            <ChevronDown size={16} className={`transform ${expandedSections[key] ? "rotate-180" : ""}`} />
         </button>
         {expandedSections[key] && <div className="pb-2 space-y-1">{content}</div>}
      </div>
   );

   const facetOptions = (key: MultiValueFilter) => {
      const selected = listParam(params[key]);
      // Keep selected values visible even if they no longer match anything
      const options = [...facets[key], ...selected.filter((value) => !facets[key].some(([option]) => option === value)).map((value) => [value, 0] as [string, number])];
      if (options.length === 0) return <p className="text-sm text-gray-400">—</p>;
      return options.map(([value, count]) => (
         <label key={value} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={selected.includes(value)} onChange={() => navigate({ [key]: toggleListValue(params[key], value) })} className={customCheckboxStyles} />
            <span className="flex-1 truncate">{value}</span>
            <span className="text-xs text-gray-400">{count}</span>
         </label>
      ));
   };

   return (
      <>
         {/* Main Filter sidebar */}
         <div
            className={`
            fixed lg:relative top-0 left-0 h-screen lg:h-auto
            w-64 bg-white z-50 lg:z-20
            transform ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            transition-transform duration-300 ease-in-out
            border-r border-gray-200 p-4
            lg:min-w-[250px] lg:max-w-[250px]
            lg:sticky lg:top-20
            overflow-y-auto
            ${isOpen ? "mt-0" : ""}
         `}
         >
            <div className="flex items-center justify-between mb-2">
               <span className="text-lg font-semibold">{t("filter")}</span>
               {hasActiveFilters(params) && (
                  <button onClick={() => navigate(Object.fromEntries(FILTER_KEYS.map((key) => [key, undefined])))} className="text-sm text-pink-700 hover:underline">
                     {t("clearAll")}
                  </button>
               )}
               <button className="lg:hidden" onClick={() => setIsOpen(false)} aria-label={t("close")}>
                  <X size={20} />
               </button>
            </div>

            {/* Filter sections */}
            <div className="space-y-2">
               {section(
                  "price",
                  t("price"),
                  <div className="flex gap-2">
                     <input type="number" min={0} name="min" placeholder={t("minPrice")} value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="w-full px-2 py-1 border rounded" />
                     <input type="number" min={0} name="max" placeholder={t("maxPrice")} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-full px-2 py-1 border rounded" />
                  </div>
               )}

               {section(
                  "category",
                  t("category"),
                  categ?.map((item) => (
                     <label key={item.name} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={params.cat === item.name} onChange={() => navigate(params.cat === item.name ? { cat: undefined, subcat: undefined } : { cat: item.name, subcat: undefined })} className={customCheckboxStyles} />
                        <span>{item.name[0].toUpperCase() + item.name.slice(1)}</span>
                     </label>
                  ))
               )}

               {/* Subcategories filter - only show if a category is selected */}
               {params.cat &&
                  section(
                     "subcategory",
                     t("subcategory"),
                     categ
                        ?.find((cat) => cat.name === params.cat)
                        ?.subcategories?.map((subcat) => (
                           <label key={subcat.name} className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={params.subcat === subcat.name} onChange={() => navigate({ subcat: params.subcat === subcat.name ? undefined : subcat.name })} className={customCheckboxStyles} />
                              <span>{subcat.name[0].toUpperCase() + subcat.name.slice(1)}</span>
                           </label>
                        ))
                  )}

               {section("brand", t("brand"), facetOptions("brand"))}
               {section("size", t("size"), facetOptions("size"))}
               {section("colour", t("color"), facetOptions("colour"))}

               {section(
                  "availability",
                  t("availability"),
                  <>
                     <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={params.stock === "1"} onChange={() => navigate({ stock: params.stock === "1" ? undefined : "1" })} className={customCheckboxStyles} />
                        <span>{t("inStockOnly")}</span>
                     </label>
                     <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={params.sale === "1"} onChange={() => navigate({ sale: params.sale === "1" ? undefined : "1" })} className={customCheckboxStyles} />
                        <span>{t("onSaleOnly")}</span>
                     </label>
                  </>
               )}
            </div>
         </div>

         {/* Filter button */}
         <button className="lg:hidden fixed bottom-4 right-4 z-20 bg-black text-white p-4 md:p-5 rounded-full shadow-lg" onClick={() => setIsOpen(!isOpen)} aria-label={t("filter")}>
            <FilterIcon className="w-7 h-7 md:w-8 md:h-8 fill-white" />
         </button>

         {/* Overlay*/}
         {isOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setIsOpen(false)} />}
      </>
   );
};

export default Filter;
