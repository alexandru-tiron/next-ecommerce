"use client";

import { Brand, Category, SearchParams } from "@/types/product";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { client } from "@/lib/algoliaClient";
import { Product } from "@/types/product";
import type { SearchResponse } from "@algolia/client-search";
import { ChevronDown, Filter as FilterIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { getBrandData, getCategData } from "@/queries";
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

const Filter = ({ params }: { params: SearchParams }) => {
   const pathname = usePathname();
   const searchParams = useSearchParams();
   const t = useTranslations("ProductList");
   const [categ, setCateg] = useState<Category[]>([]);
   const [brands, setBrands] = useState<Brand[]>([]);
   const router = useRouter();
   const [isOpen, setIsOpen] = useState(false);
   const [availableSizes, setAvailableSizes] = useState<string[]>([]);
   const [expandedSections, setExpandedSections] = useState({
      price: params.min || params.max ? true : false,
      category: params.cat ? true : false,
      subcategory: params.subcat ? true : false,
      brand: params.brand ? true : false,
      size: params.size ? true : false,
   });

   useEffect(() => {
      const fetchCategories = async () => {
         const categories = await getCategData();
         setCateg(categories);
      };
      fetchCategories();
      const fetchBrands = async () => {
         const brands = await getBrandData();
         setBrands(brands);
      };
      fetchBrands();
      const fetchAvailableSizes = async () => {
         try {
            const response = await client.search<Product>({
               requests: [
                  {
                     indexName: "products",
                     query: "",
                     attributesToRetrieve: ["sku_variants"],
                     hitsPerPage: 1000,
                  },
               ],
            });

            // Extract unique sizes from sku_variants
            const allSizes = new Set<string>();
            const searchResponse = response.results[0] as SearchResponse<Product>;
            searchResponse.hits.forEach((product) => {
               product.sku_variants?.forEach((variant) => {
                  if (variant.name?.toLowerCase().includes("ml")) {
                     allSizes.add(variant.name);
                  }
               });
            });

            // Convert to array and sort
            const sizes = Array.from(allSizes).sort((a, b) => {
               const aNum = parseInt(a.replace(/[^0-9]/g, ""));
               const bNum = parseInt(b.replace(/[^0-9]/g, ""));
               return aNum - bNum;
            });

            // console.log("Available sizes:", sizes);
            setAvailableSizes(sizes);
         } catch (error) {
            console.error("Error fetching sizes:", error);
         }
      };

      fetchAvailableSizes();
   }, [params.cat]);

   const toggleSection = (section: keyof typeof expandedSections) => {
      setExpandedSections((prev) => ({
         ...prev,
         [section]: !prev[section],
      }));
   };

   const handleCheckboxChange = (name: string, value: string) => {
      const newParams = new URLSearchParams(searchParams);
      if (params[name as keyof SearchParams] === value) {
         newParams.delete(name);
         if (name === "cat") {
            newParams.delete("subcat");
         }
      } else {
         newParams.set(name, value);
      }
      router.push(`${pathname}?${newParams.toString()}`);
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
            {/* Filter sections */}
            <div className="space-y-2">
               {/* Price Range filter */}
               <div className="border-b border-gray-100">
                  <button className="flex items-center justify-between w-full py-2" onClick={() => toggleSection("price")}>
                     <span className=" font-semibold">{t("price")}</span>
                     <ChevronDown size={16} className={`transform ${expandedSections.price ? "rotate-180" : ""}`} />
                  </button>
                  {expandedSections.price && (
                     <div className="pb-2 space-y-2">
                        <div className="flex gap-2">
                           <input type="number" name="min" placeholder="Minim" value={params.min || ""} onChange={(e) => handleCheckboxChange("min", e.target.value)} className="w-full px-2 py-1  border rounded" />
                           <input type="number" name="max" placeholder="Maxim" value={params.max || ""} onChange={(e) => handleCheckboxChange("max", e.target.value)} className="w-full px-2 py-1  border rounded" />
                        </div>
                     </div>
                  )}
               </div>

               {/* Categories filter */}
               <div className="border-b border-gray-100">
                  <button className="flex items-center justify-between w-full py-2" onClick={() => toggleSection("category")}>
                     <span className=" font-semibold">{t("category")}</span>
                     <ChevronDown size={16} className={`transform ${expandedSections.category ? "rotate-180" : ""}`} />
                  </button>
                  {expandedSections.category && (
                     <div className="pb-2 space-y-1">
                        {categ?.map((item) => (
                           <label key={item.name} className="flex items-center gap-2 ">
                              <input type="checkbox" checked={params.cat === item.name} onChange={() => handleCheckboxChange("cat", item.name)} className={customCheckboxStyles} />
                              <span>{item.name[0].toUpperCase() + item.name.slice(1)}</span>
                           </label>
                        ))}
                     </div>
                  )}
               </div>

               {/* Subcategories filter - only show if a category is selected */}
               {params.cat && (
                  <div className="border-b border-gray-100">
                     <button className="flex items-center justify-between w-full py-2" onClick={() => toggleSection("subcategory")}>
                        <span className=" font-semibold">{t("subcategory")}</span>
                        <ChevronDown size={16} className={`transform ${expandedSections.subcategory ? "rotate-180" : ""}`} />
                     </button>
                     {expandedSections.subcategory && (
                        <div className="pb-2 space-y-1">
                           {categ
                              ?.find((cat) => cat.name === params.cat)
                              ?.subcategories?.map((subcat) => (
                                 <label key={subcat.name} className="flex items-center gap-2 ">
                                    <input type="checkbox" checked={params.subcat === subcat.name} onChange={() => handleCheckboxChange("subcat", subcat.name)} className={customCheckboxStyles} />
                                    <span>{subcat.name[0].toUpperCase() + subcat.name.slice(1)}</span>
                                 </label>
                              ))}
                        </div>
                     )}
                  </div>
               )}

               {/* Brands filter */}
               <div className="border-b border-gray-100">
                  <button className="flex items-center justify-between w-full py-2" onClick={() => toggleSection("brand")}>
                     <span className=" font-semibold">{t("brand")}</span>
                     <ChevronDown size={16} className={`transform ${expandedSections.brand ? "rotate-180" : ""}`} />
                  </button>
                  {expandedSections.brand && (
                     <div className="pb-2 space-y-1">
                        {brands?.map((item) => (
                           <label key={item.name} className="flex items-center gap-2 ">
                              <input type="checkbox" checked={params.brand === item.name} onChange={() => handleCheckboxChange("brand", item.name)} className={customCheckboxStyles} />
                              <span>{item.name}</span>
                           </label>
                        ))}
                     </div>
                  )}
               </div>

               {/* Size/Volume filter */}
               <div className="border-b border-gray-100">
                  <button className="flex items-center justify-between w-full py-2" onClick={() => toggleSection("size")}>
                     <span className=" font-semibold">{t("size")}</span>
                     <ChevronDown size={16} className={`transform ${expandedSections.size ? "rotate-180" : ""}`} />
                  </button>
                  {expandedSections.size && (
                     <div className="pb-2 space-y-1">
                        {availableSizes.map((size) => (
                           <label key={size} className="flex items-center gap-2 ">
                              <input type="checkbox" checked={params.size === size} onChange={() => handleCheckboxChange("size", size)} className={customCheckboxStyles} />
                              <span>{size}</span>
                           </label>
                        ))}
                     </div>
                  )}
               </div>
            </div>
         </div>

         {/* Filter button */}
         <button className="lg:hidden fixed bottom-4 right-4 z-20 bg-black text-white p-4 md:p-5 rounded-full shadow-lg" onClick={() => setIsOpen(!isOpen)}>
            <FilterIcon className="w-7 h-7 md:w-8 md:h-8 fill-white" />
         </button>

         {/* Overlay*/}
         {isOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setIsOpen(false)} />}
      </>
   );
};

export default Filter;
