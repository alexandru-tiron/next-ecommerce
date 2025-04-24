import React from "react";
import { Product } from "@/types/product";
import { useTranslations } from "next-intl";
interface ProductPricingProps {
   productData: Product;
   errors: Record<string, string>;
   handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
   isPriceDisabled?: boolean;
}

const ProductPricing: React.FC<ProductPricingProps> = ({ productData, errors, handleInputChange, isPriceDisabled = false }) => {
   const t = useTranslations();
   return (
      <div className="pt-4 border-t border-gray-200">
         <h2 className="text-lg font-medium text-gray-900 mb-4">Prețuri și stoc</h2>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
               <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                  {t("Admin.price")} (RON)*
               </label>
               <div className="relative">
                  <input
                     type="number"
                     id="price"
                     name="price"
                     value={productData.price}
                     onChange={handleInputChange}
                     min="0"
                     step="0.01"
                     disabled={isPriceDisabled}
                     className={`block w-full rounded-md border ${errors.price ? "border-red-300" : "border-gray-300"} px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${isPriceDisabled ? "bg-gray-100 cursor-not-allowed" : ""}`}
                     placeholder="0.00"
                  />
                  {isPriceDisabled && <div className="mt-1 text-xs text-gray-500">Prețul este calculat automat din variantele de cantitate</div>}
               </div>
               {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price}</p>}
            </div>

            <div>
               <label htmlFor="stoc" className="block text-sm font-medium text-gray-700 mb-1">
                  {t("Admin.stock")}*
               </label>
               <input
                  type="number"
                  id="stoc"
                  name="stoc"
                  value={productData.stoc || 12}
                  onChange={handleInputChange}
                  min="0"
                  step="1"
                  className={`block w-full rounded-md border ${errors.stoc ? "border-red-300" : "border-gray-300"} px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  placeholder="0"
               />
               {errors.stoc && <p className="mt-1 text-sm text-red-600">{errors.stoc}</p>}
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
               <div className="flex items-center h-5 mb-2">
                  <input
                     id="discount"
                     name="discount"
                     type="checkbox"
                     checked={productData.discount}
                     onChange={handleInputChange}
                     disabled={isPriceDisabled}
                     className={`h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 ${isPriceDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  />
                  <label htmlFor="discount" className={`ml-2 block text-sm text-gray-700 ${isPriceDisabled ? "opacity-50" : ""}`}>
                     {t("Admin.applyDiscountToThisProduct")}
                  </label>
               </div>

               {productData.discount && !isPriceDisabled && (
                  <div>
                     <label htmlFor="discount_price" className="block text-sm font-medium text-gray-700 mb-1">
                        {t("Admin.discountPrice")} (RON)*
                     </label>
                     <input
                        type="number"
                        id="discount_price"
                        name="discount_price"
                        value={productData.discount_price}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        className={`block w-full rounded-md border ${errors.discount_price ? "border-red-300" : "border-gray-300"} px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                        placeholder="0.00"
                     />
                     {errors.discount_price && <p className="mt-1 text-sm text-red-600">{errors.discount_price}</p>}
                  </div>
               )}
            </div>
         </div>
      </div>
   );
};

export default ProductPricing;
