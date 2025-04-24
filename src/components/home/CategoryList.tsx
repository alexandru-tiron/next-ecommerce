"use client";

import { getCategData } from "@/queries";
import { Category, Subcategory } from "@/types/product";
import { ChevronDown, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const CategoryList = () => {
   const [categ, setCateg] = useState<Category[]>([]);
   const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({});
   const toggleCategory = (categoryId: string) => {
      setExpandedCategories((prev) => ({
         ...prev,
         [categoryId]: !prev[categoryId],
      }));
   };
   useEffect(() => {
      const fetchCateg = async () => {
         const categ = await getCategData();
         setCateg(categ);
      };
      fetchCateg();
   }, []);
   return (
      <div className="relative md:overflow-auto md:scrollbar-horizontal-styled">
         <div className="flex flex-col gap-4 md:flex-row md:gap-6 md:pb-2 ">
            {categ
               .filter((item) => item.image !== null)
               .map((item) => {
                  const isExpanded = expandedCategories[item.id] || false;
                  const hasSubcategories = item.subcategories && item.subcategories.length > 0;
                  return (
                     <div
                        className="flex-shrink-0 w-full md:w-1/2 lg:w-[calc((100%/3)-1rem)] relative "
                        key={item.id}
                        style={{
                           backgroundImage: `url(${item.image})`,
                           backgroundSize: "cover",
                           backgroundPosition: "center",
                           backgroundRepeat: "no-repeat",
                        }}
                     >
                        <div className="relative w-full h-80  flex flex-col justify-left p-4 gap-3">
                           <div className="flex items-center justify-between rounded-xl backdrop-blur-xs bg-gray-500/10">
                              <Link href={`/list?cat=${item.name}`} className="flex items-center justify-center gap-2 py-2 px-2 rounded-lg transition-all">
                                 {item.icon && (
                                    <Image
                                       src={item.icon}
                                       width={30}
                                       height={30}
                                       alt={item.name}
                                       className="text-white "
                                       style={{
                                          fill: "#ffffff",
                                          color: "#ffffff",
                                          filter: "invert(100%)",
                                          WebkitFilter: "invert(100%)",
                                          msFilter: "invert(100%)",
                                       }}
                                    />
                                 )}
                                 <h1 style={{ textShadow: "0 0 10px rgba(0, 0, 0, 0.5)" }} className="text-white  text-lg lg:text-xl 2xl:text-2xl font-semibold tracking-wide">
                                    {item.name[0].toUpperCase() + item.name.slice(1)}
                                 </h1>
                              </Link>
                              {hasSubcategories && isExpanded ? (
                                 <ChevronDown
                                    className="w-10 h-10 text-white "
                                    style={{
                                       filter: "drop-shadow(0 0 10px rgba(0, 0, 0, 0.5))",
                                    }}
                                    onClick={() => {
                                       toggleCategory(item.id);
                                    }}
                                 />
                              ) : (
                                 <ChevronRight
                                    className="w-10 h-10 text-white "
                                    style={{
                                       filter: "drop-shadow(0 0 10px rgba(0, 0, 0, 0.5))",
                                    }}
                                    onClick={() => {
                                       toggleCategory(item.id);
                                    }}
                                 />
                              )}
                           </div>
                           {!isExpanded && item.description && (
                              <h2 style={{ textShadow: "0 0 10px rgba(0, 0, 0, 0.5)" }} className="p-2 text-sm text-white lg:text-base 2xl:text-lg mb-6 rounded-xl backdrop-blur-xs bg-gray-500/10">
                                 {item.description}
                              </h2>
                           )}
                           {hasSubcategories && isExpanded && (
                              <div className=" mt-1 mb-2 overflow-hidden transition-all duration-200 ease-in-out flex flex-col gap-1">
                                 {item.subcategories?.map((subcat: Subcategory) => {
                                    return (
                                       <Link key={subcat.id} href={`/list?cat=${item.name}&subcat=${subcat.name}`} className="py-1 px-2 rounded-lg text-lg transition-all text-white w-auto rounded-xl backdrop-blur-xs bg-gray-500/10">
                                          <ChevronRight
                                             className="w-7 h-7 text-white mr-2 inline-block"
                                             style={{
                                                filter: "drop-shadow(0 0 10px rgba(0, 0, 0, 0.5))",
                                             }}
                                          />
                                          <span className="font-medium text-sm lg:text-base 2xl:text-lg" style={{ textShadow: "0 0 10px rgba(0, 0, 0, 0.5)" }}>
                                             {subcat.name[0].toUpperCase() + subcat.name.slice(1)}
                                          </span>
                                       </Link>
                                    );
                                 })}
                              </div>
                           )}
                        </div>
                     </div>
                  );
               })}
         </div>
      </div>
   );
};

export default CategoryList;
