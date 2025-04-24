import React from "react";
import { Trash2, PlusCircle } from "lucide-react";
import { SKUVARIANT_TYPE, SkuVariant } from "@/types/product";
import { useTranslations } from "next-intl";
interface SKUVariantsListProps {
   skuVariants: Partial<SkuVariant>[];
   onAddSKUVariant: () => void;
   onRemoveSKUVariant: (index: number) => void;
   onSKUVariantChange: (index: number, field: string, value: string | number | boolean) => void;
}

const SKUVariantsList: React.FC<SKUVariantsListProps> = ({ skuVariants, onAddSKUVariant, onRemoveSKUVariant, onSKUVariantChange }) => {
   const t = useTranslations();
   return (
      <div className="pt-4 border-t border-gray-200">
         <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">{t("Admin.skuVariants")}</h2>
            <button type="button" onClick={onAddSKUVariant} className="inline-flex items-center px-3 py-1.5 border border-indigo-600 text-xs font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
               <PlusCircle className="h-4 w-4 mr-1" />
               {t("Admin.addSKUVariant")}
            </button>
         </div>

         {skuVariants.length === 0 ? (
            <p className="text-sm text-gray-500 italic">{t("Admin.noSKUVariant")}</p>
         ) : (
            <div className="space-y-6">
               {skuVariants.map((skuVariant: Partial<SkuVariant>, variantIndex: number) => (
                  <div key={variantIndex} className="bg-gray-50 p-4 rounded-md border border-gray-200">
                     <div className="flex justify-between mb-3">
                        <h3 className="text-sm font-medium text-gray-700">{t("Admin.skuVariant")} {variantIndex + 1}</h3>
                        <button type="button" onClick={() => onRemoveSKUVariant(variantIndex)} className="text-red-500 hover:text-red-700">
                           <Trash2 className="h-4 w-4" />
                        </button>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                           <label htmlFor={`sku-variant-name-${variantIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
                              {t("Admin.variantName")}*
                           </label>
                           <input
                              type="text"
                              id={`sku-variant-name-${variantIndex}`}
                              value={skuVariant.name || ""}
                              onChange={(e) => onSKUVariantChange(variantIndex, "name", e.target.value)}
                              className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              placeholder={t("Admin.skuVariantNamePlaceholder")}
                           />
                        </div>

                        <div>
                           <label htmlFor={`sku-variant-type-${variantIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
                              {t("Admin.variantType")}*
                           </label>
                           <select
                              id={`sku-variant-type-${variantIndex}`}
                              value={skuVariant.type || ""}
                              onChange={(e) => onSKUVariantChange(variantIndex, "type", e.target.value as SKUVARIANT_TYPE)}
                              className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                           >
                              <option value="">{t("Admin.selectSkuVariantType")}</option>
                              {Object.entries(SKUVARIANT_TYPE).map(([key, value]) => (
                                 <option key={key} value={value}>
                                    {value}
                                 </option>
                              ))}
                           </select>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                           <label htmlFor={`sku-variant-price-${variantIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
                              {t("Admin.price")}*
                           </label>
                           <input
                              type="number"
                              id={`sku-variant-price-${variantIndex}`}
                              value={skuVariant.price || 0}
                              onChange={(e) => onSKUVariantChange(variantIndex, "price", parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                              className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              placeholder={t("Admin.skuVariantPricePlaceholder")}
                           />
                        </div>

                        <div>
                           <label htmlFor={`sku-variant-code-${variantIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
                              {t("Admin.variantCode")} 
                           </label>
                           <input
                              type="text"
                              id={`sku-variant-code-${variantIndex}`}
                              value={skuVariant.code || ""}
                              onChange={(e) => onSKUVariantChange(variantIndex, "code", e.target.value)}
                              className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              placeholder={t("Admin.variantCodePlaceholder")}
                           />
                        </div>
                     </div>

                     <div className="mb-4">
                        <div className="flex items-center">
                           <input id={`sku-variant-discount-${variantIndex}`} type="checkbox" checked={skuVariant.discount || false} onChange={(e) => onSKUVariantChange(variantIndex, "discount", e.target.checked)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                           <label htmlFor={`sku-variant-discount-${variantIndex}`} className="ml-2 block text-sm text-gray-700">
                              {t("Admin.applyDiscountToThisVariant")}
                           </label>
                        </div>
                     </div>

                     {skuVariant.discount && (
                        <div className="mb-4">
                           <label htmlFor={`sku-variant-discount-price-${variantIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
                              {t("Admin.discountPrice")}*
                           </label>
                           <input
                              type="number"
                              id={`sku-variant-discount-price-${variantIndex}`}
                              value={skuVariant.discount_price || 0}
                              onChange={(e) => onSKUVariantChange(variantIndex, "discount_price", parseFloat(e.target.value) || 0)}
                              min="0"
                              step="0.01"
                              className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              placeholder={t("Admin.discountPricePlaceholder")}
                           />
                        </div>
                     )}
                  </div>
               ))}
            </div>
         )}
      </div>
   );
};

export default SKUVariantsList;
