import React, { useState } from "react";
import { X, Upload, GripVertical } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
interface ProductImagesProps {
   selectedImages: File[];
   previewUrls: string[];
   errors: Record<string, string>;
   handleImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
   handleRemoveImage: (index: number) => void;
   handleReorderImages?: ({ files, urls }: { files?: File[]; urls: string[] }) => void;
   isExistingImages?: boolean;
}

const ProductImages: React.FC<ProductImagesProps> = ({ selectedImages, previewUrls, errors, handleImageSelect, handleRemoveImage, handleReorderImages, isExistingImages = false }) => {
   const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
   const t = useTranslations();
   const handleDragStart = (e: React.DragEvent, index: number) => {
      setDraggedIndex(index);
      e.dataTransfer.effectAllowed = "move";
      // Required for Firefox
      e.dataTransfer.setData("text/plain", index.toString());

      // Add a little delay to show the drag effect visually
      setTimeout(() => {
         if (e.target instanceof HTMLElement) {
            e.target.classList.add("opacity-50");
         }
      }, 0);
   };

   const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
   };

   const handleDragEnd = (e: React.DragEvent) => {
      if (e.target instanceof HTMLElement) {
         e.target.classList.remove("opacity-50");
      }
      setDraggedIndex(null);
   };

   const handleDrop = (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();

      if (draggedIndex === null || draggedIndex === targetIndex) {
         return;
      }

      // Create copies of the arrays
      const newUrls = [...previewUrls];

      // Get the items being moved
      const draggedUrl = newUrls[draggedIndex];

      // Remove items from original position
      newUrls.splice(draggedIndex, 1);

      // Insert items at new position
      newUrls.splice(targetIndex, 0, draggedUrl);

      // Handle files reordering for new uploads
      if (!isExistingImages && handleReorderImages) {
         const newFiles = [...selectedImages];
         const draggedFile = newFiles[draggedIndex];
         newFiles.splice(draggedIndex, 1);
         newFiles.splice(targetIndex, 0, draggedFile);

         // Update parent component state with the new order
         handleReorderImages({ files: newFiles, urls: newUrls });
      } else if (handleReorderImages) {
         // For existing images, just reorder the URLs
         handleReorderImages({ urls: newUrls });
      }
   };

   // For existing images, we just show the thumbnails for reordering
   if (isExistingImages) {
      return (
         <div className="flex flex-wrap gap-2 mb-4">
            {previewUrls.map((url, index) => (
               <div key={index} className={`relative cursor-grab active:cursor-grabbing ${draggedIndex === index ? "opacity-60" : ""}`} draggable onDragStart={(e) => handleDragStart(e, index)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, index)} onDragEnd={handleDragEnd}>
                  <div className="w-16 h-16 overflow-hidden rounded border border-gray-200 group">
                     <Image src={url} alt={`Preview ${index + 1}`} width={64} height={64} className="object-cover w-full h-full" />
                     <div className="absolute inset-0 hover:bg-black/10 bg-opacity-0 transition-opacity flex items-center justify-center">
                        <GripVertical className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 drop-shadow-md" />
                     </div>
                     <div className="absolute bottom-0 left-0 bg-black bg-opacity-50 text-white text-xs px-1 rounded-tr">{index + 1}</div>
                  </div>
                  <button type="button" onClick={() => handleRemoveImage(index)} className="absolute -top-1 -right-1 p-0.5 bg-red-500 rounded-full text-white focus:outline-none hover:bg-red-600" aria-label="Remove image">
                     <X className="w-2.5 h-2.5" />
                  </button>
               </div>
            ))}
         </div>
      );
   }

   return (
      <div className="pt-2 sm:pt-4">
         {!isExistingImages && (
            <div className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center ${errors.images ? "border-red-300 bg-red-50" : "border-gray-300 hover:border-indigo-400 hover:bg-gray-50"}`}>
               <div className="text-center">
                  <Upload className="mx-auto h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                  <div className="mt-1">
                     <label htmlFor="images" className="cursor-pointer">
                        <span className="mt-1 block text-xs sm:text-sm font-medium text-gray-700">
                           <span className="hidden sm:inline">{t("Admin.dragImagesHere")}</span>
                           <span className="underline">{t("Admin.clickToUpload")}</span>
                           <span className="inline-block ml-1">({selectedImages.length}/5 {t("Admin.images")})</span>
                        </span>
                        <input id="images" name="images" type="file" multiple accept="image/*" onChange={handleImageSelect} className="sr-only" />
                     </label>
                  </div>
               </div>
            </div>
         )}
         {errors.images && <p className="text-xs sm:text-sm text-red-600 mt-1">{errors.images}</p>}

         {previewUrls.length > 0 && (
            <div className="mt-2">
               <h3 className="text-xs font-medium text-gray-700 mb-1">{isExistingImages ? t("Admin.currentImages") : t("Admin.selectedImages")} ({t("Admin.dragToReorder")})</h3>
               <div className="flex flex-wrap gap-2">
                  {previewUrls.map((url, index) => (
                     <div key={index} className={`relative cursor-grab active:cursor-grabbing ${draggedIndex === index ? "opacity-60" : ""}`} draggable onDragStart={(e) => handleDragStart(e, index)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, index)} onDragEnd={handleDragEnd}>
                        <div className="w-16 h-16 overflow-hidden rounded border border-gray-200 group">
                           <Image src={url} alt={`Preview ${index + 1}`} width={64} height={64} className="object-cover w-full h-full" />
                           <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity flex items-center justify-center">
                              <GripVertical className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 drop-shadow-md" />
                           </div>
                           <div className="absolute bottom-0 left-0 bg-black bg-opacity-50 text-white text-xs px-1 rounded-tr">{index + 1}</div>
                        </div>
                        <button type="button" onClick={() => handleRemoveImage(index)} className="absolute -top-1 -right-1 p-0.5 bg-red-500 rounded-full text-white focus:outline-none hover:bg-red-600 touch-manipulation" aria-label="Remove image">
                           <X className="w-2.5 h-2.5" />
                        </button>
                     </div>
                  ))}
               </div>
            </div>
         )}
      </div>
   );
};

export default ProductImages;
