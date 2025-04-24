"use client";

import { getCategData, getInfoData } from "@/queries";
import Link from "next/link";
import { useEffect, useState } from "react";
// import SearchBar from "./SearchBar";
import { twMerge } from "tailwind-merge";
import { Category, Subcategory } from "@/types/product";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, Menu as MenuIcon, X } from "lucide-react";
import { Info } from "@/types/user";
import { useTranslations } from "next-intl";

const Menu = () => {
   const t = useTranslations("Navbar");
   const [open, setOpen] = useState(false);
   const [bgOpen, setBgOpen] = useState(false);
   const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({});
   const [categ, setCateg] = useState<Category[]>([]);
   const [info, setInfo] = useState<Info | null>(null);
   useEffect(() => {
      const fetchCateg = async () => {
         const categ = await getCategData();
         setCateg(categ);
      };
      const fetchInfo = async () => {
         const info = await getInfoData();
         setInfo(info);
      };
      fetchCateg();
      fetchInfo();
   }, []);
   const pathname = usePathname();

   const setMenu = (state: boolean) => {
      if (state) {
         setBgOpen(state);
         setOpen(state);
      } else {
         setOpen(state);
         setTimeout(() => {
            setBgOpen(state);
         }, 200);
      }
   };

   const toggleCategory = (categoryId: string) => {
      setExpandedCategories((prev) => ({
         ...prev,
         [categoryId]: !prev[categoryId],
      }));
   };

   return (
      <div className="">
         <MenuIcon className="cursor-pointer w-7 h-7 text-gray-800 hover:text-pink-600 transition-colors" onClick={() => setMenu(!open)} />
         <div
            id="bfMenuOverlay"
            key={"bfMenuOverlay"}
            className={twMerge("fixed bg-black/50 backdrop-blur-sm left-0 top-0 w-screen h-screen z-[1000] transition-opacity duration-300", bgOpen ? "opacity-100" : "opacity-0 pointer-events-none")}
            onClick={(e) => {
               e.preventDefault();
               if ((e.target as HTMLElement).id === "bfMenuOverlay") setMenu(false);
            }}
         >
            <div
               className={twMerge(
                  "fixed bg-white h-[85vh] left-0 bottom-0 w-full shadow-xl flex flex-col rounded-t-2xl transition-transform duration-300 ease-in-out md:h-full md:w-80 md:rounded-none md:top-0",
                  open ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-y-0 md:-translate-x-full"
               )}
            >
               <div className="relative border-b border-gray-100 py-4">
                  <h2 className="w-full text-center text-2xl font-medium text-gray-800">{t("menu")}</h2>
                  <button className="absolute right-4 top-4 p-2 rounded-full bg-gray-100 hover:bg-pink-100 text-gray-600 hover:text-pink-600 transition-all" onClick={() => setMenu(false)}>
                     <X className="w-5 h-5" />
                  </button>
               </div>

               <div className="flex flex-col overflow-y-auto">
                  {/* <div className="py-4 border-b border-gray-100 md:hidden">
                     <SearchBar />
                  </div> */}

                  <div className="flex flex-col py-4 px-2 overflow-y-auto">
                     {categ.map((item: Category) => {
                        const isActive = pathname.includes(`cat=${item.name}`);
                        const isExpanded = expandedCategories[item.id] || false;
                        const hasSubcategories = item.subcategories && item.subcategories.length > 0;

                        return (
                           <div key={item.id} className="mb-1">
                              <div className="flex items-center ">
                                 <Link
                                    href={`/list?cat=${item.name}`}
                                    className={twMerge("flex items-center gap-3 py-3 px-4 rounded-lg mx-2 transition-all flex-grow", isActive ? "bg-pink-50 text-pink-700" : "hover:bg-gray-50 text-gray-700 hover:text-pink-600")}
                                    onClick={() => {
                                       setMenu(false);
                                    }}
                                 >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={item.icon} alt={item.name} className={twMerge("w-6 h-6 transition-transform", isActive ? "scale-110" : "")} />
                                    <span className={twMerge("font-medium transition-colors", isActive ? "text-pink-700" : "")}>{item.name[0].toUpperCase() + item.name.slice(1)}</span>
                                 </Link>

                                 {hasSubcategories && (
                                    <button onClick={() => toggleCategory(item.id)} className={twMerge("p-2 rounded-full mr-3 text-gray-500 hover:text-pink-600 hover:bg-gray-100 transition-all ", isExpanded ? "bg-gray-100" : "")}>
                                       {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                    </button>
                                 )}
                              </div>

                              {hasSubcategories && isExpanded && (
                                 <div className="ml-10 mr-2 mt-1 mb-2 overflow-hidden transition-all duration-200 ease-in-out">
                                    {item.subcategories?.map((subcat: Subcategory) => {
                                       const isSubActive = pathname.includes(`subcat=${subcat.name}`);
                                       return (
                                          <Link
                                             key={subcat.id}
                                             href={`/list?cat=${item.name}&subcat=${subcat.name}`}
                                             className={twMerge("flex items-center py-2 px-4 rounded-lg my-1 text-sm transition-all", isSubActive ? "bg-pink-50 text-pink-700" : "hover:bg-gray-50 text-gray-600 hover:text-pink-600")}
                                             onClick={() => {
                                                setMenu(false);
                                                toggleCategory(item.id);
                                             }}
                                          >
                                             <span>{subcat.name[0].toUpperCase() + subcat.name.slice(1)}</span>
                                          </Link>
                                       );
                                    })}
                                 </div>
                              )}
                           </div>
                        );
                     })}
                  </div>
               </div>

               <div className="mt-auto border-t border-gray-100 p-4">
                  <p className="text-center text-gray-500 text-sm">
                     © {new Date().getFullYear()} {info?.store_name}
                  </p>
               </div>
            </div>
         </div>
      </div>
   );
};

export default Menu;
