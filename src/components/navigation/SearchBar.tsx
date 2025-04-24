"use client";
import { useRouter } from "next/navigation";
import { twMerge } from "tailwind-merge";
import { useState, useRef } from "react";
import { client } from "@/lib/algoliaClient";
import { Product } from "@/types/product";
import { SearchResponse } from "@algolia/client-search";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

const SearchBar = ({ className, setIsSearchOpen }: { className?: string; setIsSearchOpen: (isSearchOpen: boolean) => void }) => {
   const router = useRouter();
   const t = useTranslations("Navbar");
   const inputRef = useRef<HTMLInputElement>(null);
   const [suggestions, setSuggestions] = useState<{ name: string; id: string }[]>([]);

   const performSearch = () => {
      const searchValue = inputRef.current?.value;
      if (searchValue) {
         router.push(`/list?name=${searchValue}`);
         setSuggestions([]);
         if (inputRef.current) {
            inputRef.current.value = "";
         }
      }
   };

   const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      performSearch();
      setIsSearchOpen(false);
   };

   const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      performSearch();
   };

   const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      if (value.length > 2) {
         // Only search after 2 characters
         try {
            const { results } = await client.search({
               requests: [
                  {
                     indexName: "products",
                     query: value,
                     hitsPerPage: 5, // Limit suggestions
                  },
               ],
            });
            const searchResult = results[0] as SearchResponse<Product>;
            setSuggestions(searchResult.hits.map((hit) => ({ name: hit.name, id: hit.objectID })));
         } catch (error) {
            console.error("Search suggestion error:", error);
         }
      } else {
         setSuggestions([]);
      }
   };

   return (
      <div className="relative w-full max-w-xl mx-auto">
         <form className={twMerge("flex items-center min-w-1/ mx-4 lg:w-full  justify-between gap-4 p-2 rounded-xl flex-1 border-slate-100 border focus-within:border-pink-600", className)} onSubmit={handleSearch}>
            <input ref={inputRef} type="text" name="name" placeholder={t("searchPlaceholder")} className="flex-1 bg-transparent outline-none" onChange={handleInputChange} />
            {inputRef.current?.value && (
               <button type="button" className="cursor-pointer" onClick={handleButtonClick}>
                  <ArrowRight className="w-5 h-5" />
               </button>
            )}
         </form>

         {suggestions.length > 0 && (
            <div className="absolute w-full mt-1 lg:left-4 bg-white border border-slate-200 rounded-xl shadow-lg z-50">
               {suggestions.map((suggestion, index) => (
                  <button
                     key={index}
                     className="w-full text-left px-4 py-2 hover:bg-slate-100 first:rounded-t-xl last:rounded-b-xl"
                     onClick={() => {
                        router.push(`/product/${suggestion.name.trim().replaceAll(" ", "-")}?id=${suggestion.id}`);
                        setSuggestions([]);
                        if (inputRef.current) {
                           inputRef.current.value = "";
                        }
                     }}
                  >
                     {suggestion.name}
                  </button>
               ))}
            </div>
         )}
      </div>
   );
};

export default SearchBar;
