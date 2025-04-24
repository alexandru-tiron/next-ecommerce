import React, { useRef, useState } from "react";
import { Trash2, PlusCircle, Upload } from "lucide-react";
import { VARIANT_TYPE, Variant } from "@/types/product";
import Image from "next/image";
import { useTranslations } from "next-intl";

interface VariantsListProps {
   variants: Partial<Variant>[];
   onAddVariant: () => void;
   onRemoveVariant: (index: number) => void;
   onVariantChange: (index: number, field: string, value: string) => void;
   onVariantImageUpload?: (index: number, file: File) => Promise<void>;
}

const VariantsList: React.FC<VariantsListProps> = ({ variants, onAddVariant, onRemoveVariant, onVariantChange, onVariantImageUpload }) => {
   const [previewUrls, setPreviewUrls] = useState<Record<number, string>>({});
   const fileInputRefs = useRef<HTMLInputElement[]>([]);
   const t = useTranslations();
   const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, variantIndex: number) => {
      if (!e.target.files || !e.target.files[0] || !onVariantImageUpload) return;

      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);

      // Store preview URL for display
      setPreviewUrls((prev) => ({
         ...prev,
         [variantIndex]: previewUrl,
      }));

      // Upload the image
      await onVariantImageUpload(variantIndex, file);
   };

   return (
      <div className="pt-4 border-t border-gray-200">
         <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">{t("Admin.variants")}</h2>
            <button type="button" onClick={onAddVariant} className="inline-flex items-center px-3 py-1.5 border border-indigo-600 text-xs font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
               <PlusCircle className="h-4 w-4 mr-1" />
               {t("Admin.addVariant")}
            </button>
         </div>

         {variants.length === 0 ? (
            <p className="text-sm text-gray-500 italic">{t("Admin.noVariants")}</p>
         ) : (
            <div className="space-y-6">
               {variants.map((variant, variantIndex) => (
                  <div key={variantIndex} className="bg-gray-50 p-4 rounded-md border border-gray-200">
                     <div className="flex justify-between mb-3">
                        <h3 className="text-sm font-medium text-gray-700">{t("Admin.variant")} {variantIndex + 1}</h3>
                        <button type="button" onClick={() => onRemoveVariant(variantIndex)} className="text-red-500 hover:text-red-700">
                           <Trash2 className="h-4 w-4" />
                        </button>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                           <label htmlFor={`variant-name-${variantIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
                              {t("Admin.variantName")}*
                           </label>
                           <input
                              type="text"
                              id={`variant-name-${variantIndex}`}
                              value={variant.name || ""}
                              onChange={(e) => onVariantChange(variantIndex, "name", e.target.value)}
                              className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              placeholder={t("Admin.variantNamePlaceholder")}
                           />
                        </div>

                        <div>
                           <label htmlFor={`variant-type-${variantIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
                              {t("Admin.variantType")}*
                           </label>
                           <select
                              id={`variant-type-${variantIndex}`}
                              value={variant.type || ""}
                              onChange={(e) => onVariantChange(variantIndex, "type", e.target.value as VARIANT_TYPE)}
                              className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                           >
                              <option value="">{t("Admin.variantTypePlaceholder")}</option>
                              {Object.entries(VARIANT_TYPE).map(([key, value]) => (
                                 <option key={key} value={value}>
                                    {value}
                                 </option>
                              ))}
                           </select>
                        </div>
                     </div>

                     <div className="mb-4">
                        <label htmlFor={`variant-code-${variantIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
                           {t("Admin.variantCode")} 
                        </label>
                        <input
                           type="text"
                           id={`variant-code-${variantIndex}`}
                           value={variant.code || ""}
                           onChange={(e) => onVariantChange(variantIndex, "code", e.target.value)}
                           className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                           placeholder={t("Admin.variantCodePlaceholder")}
                        />
                     </div>

                     <div className="mb-4">
                        <label htmlFor={`variant-description-${variantIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
                           {t("Admin.variantDescription")}
                        </label>
                        <textarea
                           id={`variant-description-${variantIndex}`}
                           value={variant.description || ""}
                           onChange={(e) => onVariantChange(variantIndex, "description", e.target.value)}
                           className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                           placeholder={t("Admin.variantDescriptionPlaceholder")}
                        />
                     </div>

                     {variant.type === VARIANT_TYPE.COLOUR ? (
                        <div className="mb-4">
                           <label htmlFor={`variant-color-${variantIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
                              {t("Admin.variantColor")}*
                           </label>
                           <div className="flex items-center">
                              <input type="color" id={`variant-color-${variantIndex}`} value={variant.media || "#000000"} onChange={(e) => onVariantChange(variantIndex, "media", e.target.value)} className="h-10 w-10 rounded mr-2 border border-gray-300" />
                              <input
                                 type="text"
                                 value={variant.media || ""}
                                 onChange={(e) => onVariantChange(variantIndex, "media", e.target.value)}
                                 className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                 placeholder={t("Admin.variantColorPlaceholder")}
                              />
                           </div>
                        </div>
                     ) : variant.type === VARIANT_TYPE.MEDIA ? (
                        <div className="mb-4">
                           <label className="block text-sm font-medium text-gray-700 mb-1">{t("Admin.media")}*</label>

                           {variant.media && (previewUrls[variantIndex] || variant.media.startsWith("http")) ? (
                              <div className="mt-2 relative">
                                 <div className="relative h-32 w-32 mx-auto mb-3">
                                    <Image src={previewUrls[variantIndex] || variant.media} alt={`Variant ${variant.name} media`} width={128} height={128} className="h-full w-full object-cover rounded-md border border-gray-200" />
                                 </div>
                              </div>
                           ) : null}

                           <div className="flex flex-col space-y-2">
                              <input
                                 type="text"
                                 value={variant.media || ""}
                                 onChange={(e) => onVariantChange(variantIndex, "media", e.target.value)}
                                 className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                 placeholder={t("Admin.variantMediaPlaceholder")}
                              />

                              <div className="mt-1 flex justify-center px-6 pt-2 pb-3 border-2 border-gray-300 border-dashed rounded-md">
                                 <div className="space-y-1 text-center">
                                    <div className="flex text-sm text-gray-600 justify-center">
                                       <label htmlFor={`variant-media-upload-${variantIndex}`} className="relative cursor-pointer bg-white font-medium text-indigo-600 hover:text-indigo-500">
                                          <span className="flex items-center">
                                             <Upload className="h-4 w-4 mr-1" />
                                             {t("Admin.uploadImage")}
                                          </span>
                                          <input
                                             id={`variant-media-upload-${variantIndex}`}
                                             type="file"
                                             className="sr-only"
                                             accept="image/*"
                                             ref={(el) => {
                                                if (el) {
                                                   fileInputRefs.current[variantIndex] = el;
                                                }
                                             }}
                                             onChange={(e) => handleFileSelect(e, variantIndex)}
                                          />
                                       </label>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                     ) : (
                        <div className="mb-4">
                           <label htmlFor={`variant-media-${variantIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
                              {t("Admin.mediaUrl")}
                           </label>
                           <input
                              type="text"
                              id={`variant-media-${variantIndex}`}
                              value={variant.media || ""}
                              onChange={(e) => onVariantChange(variantIndex, "media", e.target.value)}
                              className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              placeholder={t("Admin.mediaUrlPlaceholder")}
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

export default VariantsList;
