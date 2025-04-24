import React, { useState, useRef, useEffect } from "react";
import { X, Camera, Trash2, AlertTriangle, ImageIcon } from "lucide-react";
import { db, storage } from "@/lib/firebaseInit";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Image from "next/image";
import { Subcategory } from "@/types/product";
import { refreshCategData } from "@/queries";
import { useTranslations } from "next-intl";
interface SubcategoryModalProps {
   isOpen: boolean;
   onClose: () => void;
   categoryId?: string;
   categoryName?: string;
}

const SubcategoryModal: React.FC<SubcategoryModalProps> = ({ isOpen, onClose, categoryId, categoryName }) => {
   const t = useTranslations();
   const [name, setName] = useState("");
   const [description, setDescription] = useState("");
   const [iconUrl, setIconUrl] = useState<string | null>(null);
   const [iconFile, setIconFile] = useState<File | null>(null);
   const [imageFile, setImageFile] = useState<File | null>(null);
   const [imageUrl, setImageUrl] = useState<string | null>(null);
   const [errors, setErrors] = useState<Record<string, string>>({});
   const [isSaving, setIsSaving] = useState(false);
   const [submitError, setSubmitError] = useState<string | null>(null);
   const iconInputRef = useRef<HTMLInputElement>(null);
   const imageInputRef = useRef<HTMLInputElement>(null);

   // Clean up preview URLs when component unmounts
   useEffect(() => {
      return () => {
         if (imageUrl) URL.revokeObjectURL(imageUrl);
         if (iconUrl) URL.revokeObjectURL(iconUrl);
      };
   }, [imageUrl, iconUrl]);
   if (!categoryId) onClose();
   if (!categoryName) onClose();

   const handleIconSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
         const file = e.target.files[0];

         // Check if file is SVG
         if (!file.type.includes("svg")) {
            setErrors((prev) => ({ ...prev, icon: t("Admin.iconError") }));
            if (iconInputRef.current) iconInputRef.current.value = "";
            return;
         }

         setIconFile(file);
         setIconUrl(URL.createObjectURL(file));
         // Remove the icon error by creating a new object without that key
         setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors.icon;
            return newErrors;
         });
      }
   };

   const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
         const file = e.target.files[0];
         setImageFile(file);
         setImageUrl(URL.createObjectURL(file));
      }
   };

   const removeIcon = () => {
      setIconUrl(null);
      setIconFile(null);
      if (iconInputRef.current) {
         iconInputRef.current.value = "";
      }
   };

   const removeImage = () => {
      setImageUrl(null);
      setImageFile(null);
      if (imageInputRef.current) {
         imageInputRef.current.value = "";
      }
   };

   const validateForm = () => {
      const newErrors: Record<string, string> = {};

      if (!name.trim()) {
         newErrors.name = t("Admin.subcategoryNameRequired");
      }

      if (!categoryId) {
         newErrors.category = t("Admin.categoryRequired");
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
   };

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm() || !categoryId) {
         return;
      }

      setIsSaving(true);
      setSubmitError(null);

      try {
         let iconURL = null;
         let imageURL = null;
         if (iconFile) {
            const iconStorageRef = ref(storage, `Categories/Icons/${Date.now()}_${iconFile.name}`);
            await uploadBytes(iconStorageRef, iconFile, { contentType: iconFile.type, cacheControl: "public, max-age=2678400" });
            iconURL = await getDownloadURL(iconStorageRef);
         }

         if (imageFile) {
            const imageStorageRef = ref(storage, `Categories/Images/${Date.now()}_${imageFile.name}`);
            await uploadBytes(imageStorageRef, imageFile, {
               cacheControl: "public, max-age=2678400",
            });
            imageURL = await getDownloadURL(imageStorageRef);
         }

         const subcategoryData: Partial<Subcategory> = {
            name,
         };
         if (description) subcategoryData.description = description;
         if (iconURL) subcategoryData.icon = iconURL;
         if (imageURL) subcategoryData.image = imageURL;

         await addDoc(collection(db, "Categories", categoryId, "Subcategories"), subcategoryData);

         // Refresh categories
         await refreshCategData();

         // Reset form
         setName("");
         setDescription("");
         setIconUrl(null);
         setIconFile(null);
         setImageFile(null);
         setImageUrl(null);
         setErrors({});

         // Close modal
         onClose();
      } catch (error) {
         console.error("Error adding subcategory:", error);
         setSubmitError(error instanceof Error ? error.message : t("Admin.subcategoryAddError"));
      } finally {
         setIsSaving(false);
      }
   };

   if (!isOpen) return null;

   return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
         <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/60 bg-opacity-50 transition-opacity" onClick={onClose}></div>

            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-auto p-6">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">{t("Admin.addSubcategory")}</h3>
                  <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-500">
                     <X className="h-5 w-5" />
                  </button>
               </div>

               {submitError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                     <div className="flex items-center">
                        <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                        <span className="text-sm text-red-700">{submitError}</span>
                     </div>
                  </div>
               )}

               <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t("Admin.category")}</label>
                        <div className={`px-3 py-2 border ${errors.category ? "border-red-300" : "border-gray-300"} rounded-md bg-gray-50 text-sm text-gray-700`}>{categoryName || t("Admin.noCategorySelected")}</div>
                        {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
                     </div>

                     <div>
                        <label htmlFor="subcategory-name" className="block text-sm font-medium text-gray-700 mb-1">
                           {t("Admin.subcategoryName")}*
                        </label>
                        <input
                           type="text"
                           id="subcategory-name"
                           value={name}
                           onChange={(e) => setName(e.target.value)}
                           className={`block w-full rounded-md border ${errors.name ? "border-red-300" : "border-gray-300"} px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                           placeholder={t("Admin.subcategoryNamePlaceholder")}
                        />
                        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                     </div>

                     <div>
                        <label htmlFor="subcategory-description" className="block text-sm font-medium text-gray-700 mb-1">
                           {t("Admin.description")}
                        </label>
                        <textarea
                           id="subcategory-description"
                           value={description}
                           onChange={(e) => setDescription(e.target.value)}
                           rows={3}
                           className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                           placeholder={t("Admin.subcategoryDescriptionPlaceholder")}
                        />
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                           {t("Admin.subcategoryIcon")} <span className="text-xs text-gray-500">({t("Admin.optional")}, {t("Admin.svgOnly")})</span>
                        </label>

                        {!iconUrl ? (
                           <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${errors.icon ? "border-red-300" : "border-gray-300"} border-dashed rounded-md`}>
                              <div className="space-y-1 text-center">
                                 <Camera className="mx-auto h-12 w-12 text-gray-400" />
                                 <div className="flex text-sm text-gray-600">
                                    <label htmlFor="subcategory-icon" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                                       <span>{t("Admin.uploadIcon")}</span>
                                       <input id="subcategory-icon" ref={iconInputRef} type="file" className="sr-only" onChange={handleIconSelect} accept="image/svg+xml" />
                                    </label>
                                 </div>
                                 <p className="text-xs text-gray-500">{t("Admin.svgOnly")}</p>
                              </div>
                           </div>
                        ) : (
                           <div className="mt-1 relative">
                              <div className="relative h-32 w-32 mx-auto">
                                 <Image src={iconUrl} alt="Subcategory icon preview" className="h-full w-full object-contain rounded-md" width={128} height={128} />
                                 <button type="button" onClick={removeIcon} className="absolute -top-2 -right-2 bg-red-100 rounded-full p-1 text-red-600 hover:text-red-700 focus:outline-none">
                                    <Trash2 className="h-4 w-4" />
                                 </button>
                              </div>
                           </div>
                        )}
                        {errors.icon && <p className="mt-1 text-sm text-red-600">{errors.icon}</p>}
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                           {t("Admin.subcategoryImage")} <span className="text-xs text-gray-500">({t("Admin.optional")})</span>
                        </label>
                        {!imageUrl ? (
                           <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                              <div className="space-y-1 text-center">
                                 <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                                 <div className="flex text-sm text-gray-600">
                                    <label htmlFor="category-image" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                                       <span>{t("Admin.uploadImage")}</span>
                                       <input id="category-image" ref={imageInputRef} type="file" className="sr-only" onChange={handleImageSelect} accept="image/*" />
                                    </label>
                                 </div>
                                 <p className="text-xs text-gray-500">{t("Admin.imageTypes")}</p>
                              </div>
                           </div>
                        ) : (
                           <div className="mt-1 relative">
                              <div className="relative h-32 w-32 mx-auto">
                                 <Image src={imageUrl} alt="Category image preview" className="h-full w-full object-cover rounded-md" width={128} height={128} />
                                 <button type="button" onClick={removeImage} className="absolute -top-2 -right-2 bg-red-100 rounded-full p-1 text-red-600 hover:text-red-700 focus:outline-none">
                                    <Trash2 className="h-4 w-4" />
                                 </button>
                              </div>
                           </div>
                        )}
                     </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                     <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        {t("Admin.cancel")}
                     </button>
                     <button
                        type="submit"
                        disabled={isSaving || !categoryId}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                     >
                        {isSaving ? t("Admin.saving") : t("Admin.saveSubcategory")}
                     </button>
                  </div>
               </form>
            </div>
         </div>
      </div>
   );
};

export default SubcategoryModal;
