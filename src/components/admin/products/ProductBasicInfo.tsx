import React, { useEffect, useState } from "react";
import { PlusCircle } from "lucide-react";
import { Brand, Category, Product, Subcategory } from "@/types/product";
import { useTranslations } from "next-intl";
import { getBrandData, getCategData } from "@/queries";
interface ProductBasicInfoProps {
   productData: Product;
   errors: Record<string, string>;
   handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
   handleCategoryChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
   handleSubcategoryChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
   onOpenCategoryModal: () => void;
   onOpenSubcategoryModal: () => void;
   onOpenBrandModal: () => void;
}

const ProductBasicInfo: React.FC<ProductBasicInfoProps> = ({ productData, errors, handleInputChange, handleCategoryChange, handleSubcategoryChange, onOpenCategoryModal, onOpenSubcategoryModal, onOpenBrandModal }) => {
   const t = useTranslations();
   const[categories, setCategories] = useState<Category[]>([]);
   const[brands, setBrands] = useState<Brand[]>([]);
   const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);
   // Filter subcategories based on selected category
   // const filteredSubcategories = categories.find((cat) => cat.id === productData.category_id)?.subcategories || [];

   useEffect(() => {
      const fetchCategories = async () => {
         const categories = await getCategData();
         setCategories(categories);
      };
      fetchCategories();
      const fetchBrands = async () => {
         const brands = await getBrandData();
         setBrands(brands);
      };
      fetchBrands();
   }, []);
   // Handle subcategory selection with both ID and name
   const onSubcategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const subcategoryId = e.target.value;
      const subcategory = filteredSubcategories.find((sub) => sub.id === subcategoryId);

      if (handleSubcategoryChange) {
         handleSubcategoryChange(e);
      } else {
         // Fallback handling to update both ID and name
         const event = {
            ...e,
            target: {
               ...e.target,
               name: "subcategory_id",
               value: subcategoryId,
            },
         };
         handleInputChange(event);

         if (subcategory) {
            const nameEvent = {
               ...e,
               target: {
                  ...e.target,
                  name: "subcategory_name",
                  value: subcategory.name,
               },
            };
            handleInputChange(nameEvent as React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>);
         }
      }
   };

   return (
      <div className="space-y-4">
         <h2 className="text-lg font-medium text-gray-900 mb-4">{t("Admin.basicInformation")}</h2>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Product Name */}
            <div>
               <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  {t("Admin.productName")}*
               </label>
               <input
                  type="text"
                  id="name"
                  name="name"
                  value={productData.name}
                  onChange={handleInputChange}
                  className={`block w-full rounded-md border ${errors.name ? "border-red-300" : "border-gray-300"} px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  placeholder={t("Admin.productNamePlaceholder")}
               />
               {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            {/* Product Code */}
            <div>
               <label htmlFor="product_code" className="block text-sm font-medium text-gray-700 mb-1">
                  {t("Admin.productCode")}
               </label>
               <input
                  type="text"
                  id="product_code"
                  name="product_code"
                  value={productData.product_code}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder={t("Admin.productCodePlaceholder")}
               />
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category */}
            <div>
               <div className="flex justify-between items-center mb-1">
                  <label htmlFor="category_id" className="block text-sm font-medium text-gray-700">
                     {t("Admin.category")}*
                  </label>
                  <button type="button" onClick={onOpenCategoryModal} className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-500">
                     <PlusCircle className="h-4 w-4 mr-1" />
                     {t("Admin.add")}
                  </button>
               </div>
               <select
                  id="category_id"
                  name="category_id"
                  value={productData.category_id}
                  onChange={handleCategoryChange}
                  className={`block w-full rounded-md border ${errors.category_id ? "border-red-300" : "border-gray-300"} px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
               >
                  <option value="">{t("Admin.categoryPlaceholder")}</option>
                  {categories.map((category) => (
                     <option key={category.id} value={category.id}>
                        {category.name}
                     </option>
                  ))}
               </select>
               {errors.category_id && <p className="mt-1 text-sm text-red-600">{errors.category_id}</p>}
            </div>

            {/* Subcategory */}
            <div>
               <div className="flex justify-between items-center mb-1">
                  <label htmlFor="subcategory_id" className="block text-sm font-medium text-gray-700">
                     {t("Admin.subcategory")}
                  </label>
                  <button type="button" onClick={onOpenSubcategoryModal} className={`inline-flex items-center text-sm text-indigo-600 hover:text-indigo-500 ${!productData.category_id ? "opacity-50 cursor-not-allowed" : ""}`} disabled={!productData.category_id}>
                     <PlusCircle className="h-4 w-4 mr-1" />
                     {t("Admin.add")}
                  </button>
               </div>
               <select
                  id="subcategory_id"
                  name="subcategory_id"
                  value={productData.subcategory_id}
                  onChange={onSubcategoryChange}
                  disabled={!productData.category_id}
                  className={`block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${!productData.category_id ? "bg-gray-100" : ""}`}
               >
                  <option value="">{t("Admin.subcategoryPlaceholder")}</option>
                  {filteredSubcategories.map((subcategory) => (
                     <option key={subcategory.id} value={subcategory.id}>
                        {subcategory.name}
                     </option>
                  ))}
               </select>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Brand */}
            <div>
               <div className="flex justify-between items-center mb-1">
                  <label htmlFor="brand" className="block text-sm font-medium text-gray-700">
                     {t("Admin.brand")}*
                  </label>
                  <button type="button" onClick={onOpenBrandModal} className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-500">
                     <PlusCircle className="h-4 w-4 mr-1" />
                     {t("Admin.add")}
                  </button>
               </div>
               <select
                  id="brand"
                  name="brand"
                  value={productData.brand}
                  onChange={handleInputChange}
                  className={`block w-full rounded-md border ${errors.brand ? "border-red-300" : "border-gray-300"} px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
               >
                  <option value="">{t("Admin.brandPlaceholder")}</option>
                  {brands.map((brand) => (
                     <option key={brand.id} value={brand.name}>
                        {brand.name}
                     </option>
                  ))}
               </select>
               {errors.brand && <p className="mt-1 text-sm text-red-600">{errors.brand}</p>}
            </div>

            {/* Weight */}
            <div>
               <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
                  {t("Admin.weight")} (g)*
               </label>
               <input
                  type="number"
                  id="weight"
                  name="weight"
                  min="0"
                  step="1"
                  value={productData.weight}
                  onChange={handleInputChange}
                  className={`block w-full rounded-md border ${errors.weight ? "border-red-300" : "border-gray-300"} px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  placeholder={t("Admin.weightPlaceholder")}
               />
               {errors.weight && <p className="mt-1 text-sm text-red-600">{errors.weight}</p>}
            </div>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Weight */}
            <div className="flex items-center h-5 mb-2">
               <input id="product_of_month" name="product_of_month" type="checkbox" checked={productData.product_of_month} onChange={handleInputChange} className={`h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 `} />
               <label htmlFor="product_of_month" className={`ml-2 block text-sm text-gray-700 `}>
                  {t("Admin.productOfMonth")}
               </label>
            </div>
         </div>
      </div>
   );
};

export default ProductBasicInfo;
