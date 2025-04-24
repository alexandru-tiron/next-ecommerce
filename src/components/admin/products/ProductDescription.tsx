import React from "react";
import { Product } from "@/types/product";
import { useTranslations } from "next-intl";

interface ProductDescriptionProps {
   productData: Product;
   errors: Record<string, string>;
   handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const ProductDescription: React.FC<ProductDescriptionProps> = ({ productData, errors, handleInputChange }) => {
   const t = useTranslations();
   return (
      <div className="pt-4 border-t border-gray-200">
         <h2 className="text-lg font-medium text-gray-900 mb-4">{t("Admin.productDescription")}</h2>
         <div className="space-y-4">
            <div>
               <label htmlFor="short_description" className="block text-sm font-medium text-gray-700 mb-1">
                  {t("Admin.shortDescription")}*
               </label>
               <textarea
                  id="short_description"
                  name="short_description"
                  rows={3}
                  value={productData.short_description}
                  onChange={handleInputChange}
                  className={`block w-full rounded-md border ${errors.short_description ? "border-red-300" : "border-gray-300"} px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  placeholder={t("Admin.shortDescriptionPlaceholder")}
               />
               {errors.short_description && <p className="mt-1 text-sm text-red-600">{errors.short_description}</p>}
            </div>

            <div>
               <label htmlFor="long_description" className="block text-sm font-medium text-gray-700 mb-1">
                  {t("Admin.longDescription")}
               </label>
               <textarea
                  id="long_description"
                  name="long_description"
                  rows={6}
                  value={productData.long_description}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder={t("Admin.longDescriptionPlaceholder")}
               />
            </div>

            <div>
               <label htmlFor="how_to" className="block text-sm font-medium text-gray-700 mb-1">
                  {t("Admin.howTo")}
               </label>
               <textarea
                  id="how_to"
                  name="how_to"
                  rows={3}
                  value={productData.how_to}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder={t("Admin.howToPlaceholder")}
               />
            </div>
         </div>
      </div>
   );
};

export default ProductDescription;
