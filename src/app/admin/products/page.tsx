"use client";

import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "@/lib/firebaseInit";
import { deleteDoc, doc, getDoc } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { Edit, Plus, Search, Trash, Filter, ArrowUp, ArrowDown, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Product, Category, Brand } from "@/types/product";
import Image from "next/image";
import { usePopupContext } from "@/context/PopupContext";
import { client } from "@/lib/algoliaClient";
import { SearchResponse } from "@algolia/client-search";
import { getCategData, getBrandData } from "@/queries";
import { useTranslations } from "next-intl";
// Simple debounce function
const useDebounce = (value: string, delay: number) => {
   const [debouncedValue, setDebouncedValue] = useState(value);

   useEffect(() => {
      const handler = setTimeout(() => {
         setDebouncedValue(value);
      }, delay);

      return () => {
         clearTimeout(handler);
      };
   }, [value, delay]);

   return debouncedValue;
};

// Search type options
type SearchType = "name" | "product_code" | "price";

// Available sort fields
type SortField = "name" | "price" | "sold";

export default function ProductsPage() {
   const  t  = useTranslations();
   const [isLoading, setIsLoading] = useState(true);
   const [initialLoad, setInitialLoad] = useState(true);
   const [products, setProducts] = useState<Product[]>([]);
   const [searchTerm, setSearchTerm] = useState("");
   const [searchType, setSearchType] = useState<SearchType>("name");
   const [minPrice, setMinPrice] = useState<string>("");
   const [maxPrice, setMaxPrice] = useState<string>("");
   const [currentPage, setCurrentPage] = useState(1);
   const [totalPages, setTotalPages] = useState(0);
   const [sortField, setSortField] = useState<SortField>("name");
   const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
   const [selectedCategory, setSelectedCategory] = useState<string>("");
   const [selectedBrand, setSelectedBrand] = useState<string>("");
   const [categ, setCateg] = useState<Category[]>([]);
   const [brands, setBrands] = useState<Brand[]>([]);
   const { setPopup } = usePopupContext();
   const [productToDelete, setProductToDelete] = useState<string | null>(null);
   const [deleteLoading, setDeleteLoading] = useState(false);
   const searchInputRef = useRef<HTMLInputElement>(null);

   // Debounced search term
   const debouncedSearchTerm = useDebounce(searchTerm, 800);
   const debouncedMinPrice = useDebounce(minPrice, 800);
   const debouncedMaxPrice = useDebounce(maxPrice, 800);

   const itemsPerPage = 50;

   // Reset pagination when search or filters change
   useEffect(() => {
      setCurrentPage(1);
   }, [debouncedSearchTerm, searchType, selectedCategory, selectedBrand, debouncedMinPrice, debouncedMaxPrice, sortField, sortDirection]);

   useEffect(() => {
      if (!initialLoad && searchInputRef.current) {
         searchInputRef.current.focus();
      }
   }, [products, initialLoad]);

   // Reset search fields when changing search type
   useEffect(() => {
      setSearchTerm("");
      setMinPrice("");
      setMaxPrice("");
   }, [searchType]);

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
      const fetchProducts = async () => {
         try {
            setIsLoading(true);
            console.log("Fetching products data from Algolia...");

            // Build filter conditions
            const filterConditions = [];

            // Add category filter if selected
            if (selectedCategory) {
               const categoryDoc = await getDoc(doc(db, "Categories", selectedCategory));
               if (categoryDoc.exists()) {
                  const categoryName = categoryDoc.data().name;
                  filterConditions.push(`category_name:'${categoryName.replace(/'/g, "\\'")}'`);
               }
            }

            // Add brand filter if selected
            if (selectedBrand) {
               filterConditions.push(`brand:'${selectedBrand.replace(/'/g, "\\'")}'`);
            }

            // Add price filters if provided
            if (debouncedMinPrice && !isNaN(parseFloat(debouncedMinPrice))) {
               filterConditions.push(`price >= ${parseFloat(debouncedMinPrice)}`);
            }

            if (debouncedMaxPrice && !isNaN(parseFloat(debouncedMaxPrice))) {
               filterConditions.push(`price <= ${parseFloat(debouncedMaxPrice)}`);
            }

            // Determine which index to use based on sort
            const indexName = getSortByValue(`${sortDirection} ${sortField}`);

            // Build query based on search type
            let query = "";
            if (searchType === "price") {
               // Price filters are handled in the filterConditions above
               query = "";
            } else if (searchType === "name" && debouncedSearchTerm) {
               query = debouncedSearchTerm;
            } else if (searchType === "product_code" && debouncedSearchTerm) {
               // For product code, we use a specific attribute to search
               filterConditions.push(`product_code:'${debouncedSearchTerm.replace(/'/g, "\\'")}'`);
            }

            // Create search request
            const searchRequest = {
               requests: [
                  {
                     indexName,
                     query,
                     filters: filterConditions.length > 0 ? filterConditions.join(" AND ") : undefined,
                     hitsPerPage: itemsPerPage,
                     page: currentPage - 1,
                  },
               ],
            };

            console.log("Search request:", searchRequest);
            const { results } = await client.search(searchRequest);
            console.log("Search response:", results[0]);

            const searchResult = results[0] as SearchResponse<Product>;
            const mappedHits = searchResult.hits.map((hit) => ({
               ...hit,
               id: hit.objectID,
            }));

            setProducts(mappedHits);
            setTotalPages(searchResult.nbPages ?? 0);
            setCurrentPage((searchResult.page ?? 0) + 1);

            setIsLoading(false);
            setInitialLoad(false);
         } catch (error) {
            console.error("Error fetching products:", error);
            setIsLoading(false);
            setInitialLoad(false);
         }
      };

      fetchProducts();
   }, [currentPage, debouncedSearchTerm, searchType, selectedCategory, selectedBrand, debouncedMinPrice, debouncedMaxPrice, sortField, sortDirection]);

   // Handle page change
   const handlePageChange = (page: number) => {
      setCurrentPage(page);
   };

   // Handle search form submission
   const handleSearchSubmit = (e: React.FormEvent) => {
      e.preventDefault();
   };

   // Handle sort toggle
   const toggleSort = (field: SortField) => {
      if (sortField === field) {
         setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      } else {
         setSortField(field);
         setSortDirection("asc");
      }
   };

   // Handle product deletion confirmation
   const confirmDeleteProduct = (productId: string) => {
      setProductToDelete(productId);
      setPopup({
         title: t("Admin.deleteProduct"),
         description: [<p key="delete-msg">{t("Admin.deleteProductConfirmation")}</p>],
         buttons: [
            {
               label: t("Admin.cancel"),
               onClick: () => setProductToDelete(null),
               className: "secondary",
            },
            {
               label: deleteLoading ? t("Admin.deleting") : t("Admin.delete"),
               onClick: () => handleDeleteProduct(),
               className: "primary",
            },
         ],
      });
   };

   // Handle product deletion
   const handleDeleteProduct = async () => {
      try {
         if (!productToDelete) return;

         setDeleteLoading(true);

         // Find the product to get its images
         const product = products.find((p) => p.id === productToDelete);

         if (product?.product_images) {
            // Delete all images from storage
            for (const imageUrl of product.product_images) {
               try {
                  // Extract the path from the full URL
                  const imagePath = imageUrl.split("/o/")[1].split("?")[0];
                  const imageRef = ref(storage, decodeURIComponent(imagePath));
                  await deleteObject(imageRef);
               } catch (error) {
                  console.error("Error deleting image:", error);
                  // Continue with the deletion even if an image deletion fails
               }
            }
         }

         // Delete the product from Firestore
         await deleteDoc(doc(db, "Products", productToDelete));

         // Also delete from Algolia index - this will be handled by a Cloud Function or backend process

         // Update local state
         setProducts(products.filter((product) => product.id !== productToDelete));
         setProductToDelete(null);
         setDeleteLoading(false);
         setPopup(null);

         console.log(`Product ${productToDelete} deleted successfully`);
      } catch (error) {
         console.error("Error deleting product:", error);
         setDeleteLoading(false);
         setPopup({
            title: t("Admin.error"),
            description: [<p key="error-msg">{t("Admin.deleteProductError")}</p>],
            buttons: [
               {
                  label: t("Admin.understand"),
                  onClick: () => setProductToDelete(null),
                  className: "primary",
               },
            ],
         });
      }
   };

   if (initialLoad) {
      return (
         <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
         </div>
      );
   }

   return (
      <div className="space-y-6">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
            <div>
               <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">{t("Admin.products")}</h1>
               <p className="mt-1 text-sm text-gray-500">{t("Admin.productManagement")}</p>
            </div>
            <Link
               href="/admin/products/add"
               className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
               <Plus className="w-4 h-4 mr-2" />
               {t("Admin.addProduct")}
            </Link>
         </div>

         {/* Filters Section */}
         <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <form onSubmit={handleSearchSubmit} className="space-y-4">
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Search type */}
                  <div className="lg:col-span-3">
                     <select value={searchType} onChange={(e) => setSearchType(e.target.value as SearchType)} className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm">
                        <option value="name">{t("Admin.searchProductbyName")}</option>
                        <option value="product_code">{t("Admin.searchProductbyProductCode")}</option>
                        <option value="price">{t("Admin.searchProductbyPrice")}</option>
                     </select>
                  </div>

                  {/* Search input (changes based on search type) */}
                  <div className="lg:col-span-9">
                     {searchType === "price" ? (
                        <div className="grid grid-cols-2 gap-4">
                           <div className="relative">
                              <input
                                 type="number"
                                 value={minPrice}
                                 onChange={(e) => setMinPrice(e.target.value)}
                                 placeholder={t("Admin.minPrice")}
                                 className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                              />
                           </div>
                           <div className="relative">
                              <input
                                 type="number"
                                 value={maxPrice}
                                 onChange={(e) => setMaxPrice(e.target.value)}
                                 placeholder={t("Admin.maxPrice")}
                                 className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                              />
                           </div>
                        </div>
                     ) : (
                        <div className="relative">
                           <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Search className="h-5 w-5 text-gray-400" />
                           </div>
                           <input
                              ref={searchInputRef}
                              type="text"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              placeholder={`${t("Admin.searchProductby")} ${searchType === "name" ? t("Admin.productName") : searchType === "product_code" ? t("Admin.productCode") : t("Admin.productPrice")}...`}
                              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                           />
                        </div>
                     )}
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category filter */}
                  <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Filter className="h-5 w-5 text-gray-400" />
                     </div>
                     <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm">
                        <option value="">{t("Admin.allCategories")}</option>
                        {categ.map((category) => (
                           <option key={category.id} value={category.id}>
                              {category.name}
                           </option>
                        ))}
                     </select>
                  </div>

                  {/* Brand filter */}
                  <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Filter className="h-5 w-5 text-gray-400" />
                     </div>
                     <select value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)} className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm">
                        <option value="">{t("Admin.allBrands")}</option>
                        {brands.map((brand) => (
                           <option key={brand.id} value={brand.name}>
                              {brand.name}
                           </option>
                        ))}
                     </select>
                  </div>
               </div>
            </form>
         </div>

         {/* Sorting Guide */}
         <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 text-sm text-gray-600">
            <div className="flex items-center">
               <ArrowUp className="w-4 h-4 mr-1 text-gray-500" />
               <ArrowDown className="w-4 h-4 mr-2 text-gray-500" />
               <span>{t("Admin.sortingGuide")}</span>
            </div>
         </div>

         {/* Mobile product cards - only show on small screens */}
         <div className="block sm:hidden space-y-4">
            {products.length > 0 ? (
               products.map((product) => (
                  <div key={product.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                     <div className="p-4">
                        <div className="flex items-center">
                           <div className="h-14 w-14 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
                              {product.product_images && product.product_images.length > 0 ? (
                                 <Image src={product.product_images[0]} alt={product.name || "Product image"} width={56} height={56} className="h-14 w-14 object-cover" />
                              ) : (
                                 <div className="h-14 w-14 flex items-center justify-center text-gray-400">N/A</div>
                              )}
                           </div>
                           <div className="ml-4 flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">{product.name}</div>
                              <div className="text-xs text-gray-500">{t("Admin.productCode")}: {product.product_code}</div>
                           </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                           <div>
                              <span className="text-gray-500">{t("Admin.category")}:</span> {product.category_name || "N/A"}
                           </div>
                           <div>
                              <span className="text-gray-500">{t("Admin.brand")}:</span> {product.brand || "N/A"}
                           </div>
                           <div>
                              <span className="text-gray-500">{t("Admin.price")}:</span>{" "}
                              {product.discount && product.discount_price ? (
                                 <span>
                                    <span className="font-medium">{product.discount_price} Lei</span>
                                    <span className="line-through ml-1">{product.price} Lei</span>
                                 </span>
                              ) : (
                                 <span>{product.price} Lei</span>
                              )}
                           </div>
                           <div>
                              <span className="text-gray-500">{t("Admin.stock")}:</span> {product.stoc || 0}
                           </div>
                        </div>

                        <div className="mt-4 flex justify-between border-t pt-4">
                           <Link href={`/admin/products/${product.id}`} className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                              <Edit className="w-3 h-3 mr-1" />
                              {t("Admin.edit")}
                           </Link>
                           <button onClick={() => confirmDeleteProduct(product.id)} className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700">
                              <Trash className="w-3 h-3 mr-1" />
                              {t("Admin.delete")}
                           </button>
                        </div>
                     </div>
                  </div>
               ))
            ) : (
               <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center text-sm text-gray-500">{t("Admin.noProducts")}</div>
            )}
         </div>

         {/* Desktop product table - only show on medium screens and up */}
         <div className="hidden sm:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
               <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                     <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           <button className="flex items-center focus:outline-none group" onClick={() => toggleSort("name")}>
                              <span className="mr-1">{t("Admin.product")}</span>
                              <div className="flex flex-col">
                                 <ArrowUp className={`w-3 h-3 ${sortField === "name" && sortDirection === "asc" ? "text-black" : "text-gray-300 group-hover:text-gray-500"}`} />
                                 <ArrowDown className={`w-3 h-3 -mt-1 ${sortField === "name" && sortDirection === "desc" ? "text-black" : "text-gray-300 group-hover:text-gray-500"}`} />
                              </div>
                           </button>
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider line-clamp-2 max-w-30 text-center">
                           {t("Admin.productOfTheMonth")}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           {t("Admin.category")}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           {t("Admin.brand")}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           <button className="flex items-center focus:outline-none group" onClick={() => toggleSort("price")}>
                              <span className="mr-1">{t("Admin.price")}</span>
                              <div className="flex flex-col">
                                 <ArrowUp className={`w-3 h-3 ${sortField === "price" && sortDirection === "asc" ? "text-black" : "text-gray-300 group-hover:text-gray-500"}`} />
                                 <ArrowDown className={`w-3 h-3 -mt-1 ${sortField === "price" && sortDirection === "desc" ? "text-black" : "text-gray-300 group-hover:text-gray-500"}`} />
                              </div>
                           </button>
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           {t("Admin.stock")}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           <button className="flex items-center focus:outline-none group" onClick={() => toggleSort("sold")}>
                              <span className="mr-1">{t("Admin.sold")}</span>
                              <div className="flex flex-col">
                                 <ArrowUp className={`w-3 h-3 ${sortField === "sold" && sortDirection === "asc" ? "text-black" : "text-gray-300 group-hover:text-gray-500"}`} />
                                 <ArrowDown className={`w-3 h-3 -mt-1 ${sortField === "sold" && sortDirection === "desc" ? "text-black" : "text-gray-300 group-hover:text-gray-500"}`} />
                              </div>
                           </button>
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                           {t("Admin.actions")}
                        </th>
                     </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                     {products.length > 0 ? (
                        products.map((product) => (
                           <tr key={product.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                 <div className="flex items-center">
                                    <div className="h-10 w-10 flex-shrink-0 rounded-full overflow-hidden bg-gray-100">
                                       {product.product_images && product.product_images.length > 0 ? (
                                          <Image src={product.product_images[0]} alt={product.name || "Product image"} width={40} height={40} className="h-10 w-10 object-cover" />
                                       ) : (
                                          <div className="h-10 w-10 flex items-center justify-center text-gray-400">N/A</div>
                                       )}
                                    </div>
                                    <div className="ml-4">
                                       <div className="text-sm font-medium text-gray-900 line-clamp-1">{product.name}</div>
                                       <div className="text-sm text-gray-500">Code: {product.product_code}</div>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                 <div className="text-sm text-gray-900 flex items-center justify-center">{product.product_of_month ? <CheckCircle className="w-5 h-5 text-green-500" /> : null}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                 <div className="text-sm text-gray-900">{product.category_name || "N/A"}</div>
                                 <div className="text-sm text-gray-500">{product.subcategory_name || "N/A"}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 ">{product.brand || "N/A"}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                 {product.discount && product.discount_price ? (
                                    <div>
                                       <div className="text-sm font-medium text-gray-900">{product.discount_price} Lei</div>
                                       <div className="text-sm text-gray-500 line-through">{product.price} Lei</div>
                                    </div>
                                 ) : (
                                    <div className="text-sm text-gray-900">{product.price} Lei</div>
                                 )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 ">{product.stoc || 0}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.sold || 0}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                 <div className="flex items-center justify-end space-x-2">
                                    <Link href={`/admin/products/${product.id}`} className="text-indigo-600 hover:text-indigo-900">
                                       <Edit className="w-5 h-5" />
                                       <span className="sr-only">{t("Admin.edit")}</span>
                                    </Link>
                                    <button onClick={() => confirmDeleteProduct(product.id)} className="text-red-600 hover:text-red-900">
                                       <Trash className="w-5 h-5" />
                                       <span className="sr-only">{t("Admin.delete")}</span>
                                    </button>
                                 </div>
                              </td>
                           </tr>
                        ))
                     ) : (
                        <tr>
                           <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                              {t("Admin.noProducts")}
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
               <div className="px-6 py-3 border-t border-gray-200 flex justify-between items-center">
                  <div className="text-sm text-gray-700">
                     {t("Admin.page")} {currentPage} {t("Admin.of")} {totalPages}
                  </div>
                  <div className="flex space-x-2">
                     <button onClick={() => handlePageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className={`px-3 py-1 rounded-md text-sm ${currentPage === 1 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>
                        {t("Admin.previous")}
                     </button>
                     <button
                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-1 rounded-md text-sm ${currentPage === totalPages ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                     >
                        {t("Admin.next")}
                     </button>
                  </div>
               </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
               <div className="px-6 py-3 border-t border-gray-200 flex justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
               </div>
            )}
         </div>
      </div>
   );
}

// Function to determine which Algolia index to use based on sort field
const getSortByValue = (sort: string) => {
   switch (sort) {
      case "asc price":
         return "products_price_asc";
      case "desc price":
         return "products_price_desc";
      case "asc name":
         return "products_name_asc";
      case "desc name":
         return "products_name_desc";
      case "asc sold":
         return "products_sold_asc";
      case "desc sold":
         return "products_sold_desc";
      default:
         return "products";
   }
};
