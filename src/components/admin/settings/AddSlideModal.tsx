import React, { useState, useRef, useEffect } from "react";
import { X, Camera, Trash2, AlertTriangle, Plus, Minus } from "lucide-react";
import { db, storage } from "@/lib/firebaseInit";
import { collection, addDoc, doc, updateDoc, getCountFromServer } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Image from "next/image";
import { Slide } from "@/types/user";
import { v4 } from "uuid";
import { useTranslations } from "next-intl";
interface FirebaseSlide extends Slide {
   id: string;
}

interface AddSlideModalProps {
   isOpen: boolean;
   onClose: () => void;
   editSlide?: FirebaseSlide | null;
}

interface ColorStop {
   color: string;
   position: number;
}

interface GradientBackground {
   id: string;
   type: "solid" | "gradient";
   direction: string;
   colors: ColorStop[];
}

const AddSlideModal: React.FC<AddSlideModalProps> = ({ isOpen, onClose, editSlide }) => {
   const t = useTranslations();
   const [title, setTitle] = useState("");
   const [description, setDescription] = useState("");
   const [imageUrl, setImageUrl] = useState<string | null>(null);
   const [imageFile, setImageFile] = useState<File | null>(null);
   const [url, setUrl] = useState<string | null>(null);
   const [background, setBackground] = useState<GradientBackground>({
      id: v4(),
      type: "solid",
      direction: "to-r",
      colors: [{ color: "#000000", position: 0 }],
   });
   const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);
   const [errors, setErrors] = useState<Record<string, string>>({});
   const [isSaving, setIsSaving] = useState(false);
   const [submitError, setSubmitError] = useState<string | null>(null);
   const fileInputRef = useRef<HTMLInputElement>(null);

   // Initialize form with editSlide data if provided
   useEffect(() => {
      if (editSlide) {
         setTitle(editSlide.title);
         setDescription(editSlide.description || "");
         setImageUrl(editSlide.image || null);
         setUrl(editSlide.url || null);

         // Parse the background string to set up the gradient/solid color
         if (editSlide.background) {
            const isGradient = editSlide.background.includes("gradient");
            if (isGradient) {
               const direction = editSlide.background.match(/gradient-to-(r|l|t|b|tr|tl|br|bl)/)?.[1] || "r";
               const colors = editSlide.background.match(/\[([^\]]+)\]/g)?.map((color) => color.slice(1, -1)) || [];
               setBackground({
                  id: v4(),
                  type: "gradient",
                  direction: `to-${direction}`,
                  colors: colors.map((color, index) => ({
                     color,
                     position: index === 0 ? 0 : index === colors.length - 1 ? 100 : 50,
                  })),
               });
            } else {
               const color = editSlide.background.match(/\[([^\]]+)\]/)?.[1] || "#000000";
               setBackground({
                  id: v4(),
                  type: "solid",
                  direction: "to-r",
                  colors: [{ color, position: 0 }],
               });
            }
         }
      } else {
         // Reset form when not editing
         setTitle("");
         setDescription("");
         setImageUrl(null);
         setImageFile(null);
         setUrl(null);
         setBackground({
            id: v4(),
            type: "solid",
            direction: "to-r",
            colors: [{ color: "#000000", position: 0 }],
         });
      }
   }, [editSlide]);

   const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
         const file = e.target.files[0];
         setImageFile(file);
         setImageUrl(URL.createObjectURL(file));
      }
   };

   const removeImage = () => {
      setImageUrl(null);
      setImageFile(null);
      if (fileInputRef.current) {
         fileInputRef.current.value = "";
      }
   };

   const validateForm = () => {
      const newErrors: Record<string, string> = {};

      if (!title.trim()) {
         newErrors.title = t("Admin.slideTitleRequired");
      }
      if (!imageFile && !imageUrl) {
         newErrors.image = t("Admin.slideImageRequired");
      }
      if (imageFile) {
         const allowedTypes = ["image/png", "image/jpeg", "image/gif"];
         if (!allowedTypes.includes(imageFile.type)) {
            newErrors.image = t("Admin.invalidImageType");
         }
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
   };

   const convertToTailwindGradient = (background: GradientBackground): string => {
      if (background.type === "solid") {
         return `bg-[${background.colors[0].color}]`;
      }

      const sortedColors = [...background.colors].sort((a, b) => a.position - b.position);

      return `bg-gradient-to-${background.direction.replace("to-", "")} from-[${sortedColors[0].color}] to-[${sortedColors[sortedColors.length - 1].color}]${sortedColors.length > 2 ? ` via-[${sortedColors[1].color}]` : ""}`;
   };

   const addColorStop = () => {
      if (background.colors.length >= 3) {
         return; // Don't add more than 3 colors
      }
      setBackground((prev) => ({
         ...prev,
         id: v4(),
         colors: [...prev.colors, { color: "#000000", position: background.colors.length === 1 ? 100 : 50 }],
      }));
   };

   const removeColorStop = (index: number) => {
      if (background.colors.length > 1) {
         setBackground((prev) => ({
            ...prev,
            id: v4(),
            colors: prev.colors.filter((_, i) => i !== index),
         }));
      }
   };

   const updateColorStop = (index: number, color: string, position: number) => {
      setBackground((prev) => ({
         ...prev,
         id: v4(),
         colors: prev.colors.map((stop, i) => (i === index ? { color, position } : stop)),
      }));
   };
   useEffect(() => {
      setBackgroundPreview(convertToTailwindGradient(background));
   }, [background, background.id]);

   useEffect(() => {
      return () => setBackground({ id: v4(), type: "solid", direction: "to-r", colors: [{ color: "#000000", position: 0 }] });
   }, []);

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
         return;
      }

      setIsSaving(true);
      setSubmitError(null);

      try {
         let imageURL = imageUrl;

         if (imageFile) {
            const imageStorageRef = ref(storage, `Slides/${Date.now()}_${imageFile.name}`);
            await uploadBytes(imageStorageRef, imageFile, {
               cacheControl: "public, max-age=2678400",
            });
            imageURL = await getDownloadURL(imageStorageRef);
         }

         const slideData: Partial<Slide> = {
            title,
            background: convertToTailwindGradient(background),
         };
         if (description) slideData.description = description;
         if (imageURL) slideData.image = imageURL;
         if (url) slideData.url = url;

         if (editSlide) {
            // Update existing slide
            await updateDoc(doc(db, "Settings", "Info", "Slider", editSlide.id), slideData);
         } else {
            // Create new slide
            const slideRef = collection(db, "Settings", "Info", "Slider");
            const slideSnap = await getCountFromServer(slideRef);
            const slideCount = slideSnap.data().count;
            await addDoc(slideRef, { ...slideData, order: slideCount + 1 });
         }

         // Refresh categories and brands
         // await refreshSlideData();  

         // Reset form
         setTitle("");
         setDescription("");
         setImageUrl(null);
         setImageFile(null);
         setUrl(null);
         setBackground({ id: v4(), type: "solid", direction: "to-r", colors: [{ color: "#000000", position: 0 }] });
         setBackgroundPreview(null);
         setErrors({});

         // Close modal
         onClose();
      } catch (error) {
         console.error("Error saving slide:", error);
         setSubmitError(error instanceof Error ? error.message : t("Admin.errorSavingSlide"));
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
                  <h3 className="text-lg font-medium text-gray-900">{editSlide ? t("Admin.editSlide") : t("Admin.addNewSlide")}</h3>
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
                        <label htmlFor="slide-title" className="block text-sm font-medium text-gray-700 mb-1">
                           {t("Admin.title")}*
                        </label>
                        <input
                           type="text"
                           id="slide-title"
                           value={title}
                           onChange={(e) => setTitle(e.target.value)}
                           className={`block w-full rounded-md border ${errors.name ? "border-red-300" : "border-gray-300"} px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                           placeholder={t("Admin.titleSlidePlaceholder")}
                        />
                        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
                     </div>

                     <div>
                        <label htmlFor="slide-description" className="block text-sm font-medium text-gray-700 mb-1">
                           {t("Admin.description")}
                        </label>
                        <textarea
                           id="slide-description"
                           value={description}
                           onChange={(e) => setDescription(e.target.value)}
                           rows={3}
                           className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                           placeholder={t("Admin.descriptionSlidePlaceholder")}
                        />
                     </div>
                     <div>
                        <label htmlFor="slide-url" className="block text-sm font-medium text-gray-700 mb-1">
                           {t("Admin.url")}
                        </label>
                        <input id="slide-url" value={url || ""} onChange={(e) => setUrl(e.target.value)} className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder={t("Admin.urlSlidePlaceholder")} />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t("Admin.background")}</label>
                        <div className="space-y-3">
                           <div className="flex items-center space-x-4">
                              <select
                                 value={background.type}
                                 onChange={(e) => {
                                    setBackground((prev) => ({ ...prev, type: e.target.value as "solid" | "gradient" }));
                                    if (e.target.value === "solid") {
                                       setBackground((prev) => ({ ...prev, direction: "to-r", colors: [{ color: "#000000", position: 0 }] }));
                                    }
                                 }}
                                 className="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              >
                                 <option value="solid">{t("Admin.solid")}</option>
                                 <option value="gradient">{t("Admin.gradient")}</option>
                              </select>
                              {background.type === "gradient" && (
                                 <select value={background.direction} onChange={(e) => setBackground((prev) => ({ ...prev, direction: e.target.value }))} className="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                                    <option value="to-r">{t("Admin.leftToRight")}</option>
                                    <option value="to-l">{t("Admin.rightToLeft")}</option>
                                    <option value="to-t">{t("Admin.bottomToTop")}</option>
                                    <option value="to-b">{t("Admin.topToBottom")}</option>
                                    <option value="to-tr">{t("Admin.bottomLeftToTopRight")}</option>
                                    <option value="to-tl">{t("Admin.bottomRightToTopLeft")}</option>
                                    <option value="to-br">{t("Admin.topLeftToBottomRight")}</option>
                                    <option value="to-bl">{t("Admin.topRightToBottomLeft")}</option>
                                 </select>
                              )}
                           </div>

                           <div className="space-y-2">
                              {background.colors.map((stop, index) => (
                                 <div key={index} className="flex items-center space-x-2">
                                    <input type="color" value={stop.color} onChange={(e) => updateColorStop(index, e.target.value, stop.position)} className="h-8 w-8 rounded border border-gray-300" />
                                    {background.type === "gradient" && (
                                       <input
                                          type="number"
                                          min="0"
                                          max="100"
                                          value={stop.position}
                                          onChange={(e) => updateColorStop(index, stop.color, parseInt(e.target.value) || 0)}
                                          className="w-20 rounded-md border border-gray-300 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                       />
                                    )}
                                    {background.type === "gradient" && background.colors.length > 1 && (
                                       <button type="button" onClick={() => removeColorStop(index)} className="p-1 text-red-600 hover:text-red-700 focus:outline-none">
                                          <Minus className="h-4 w-4" />
                                       </button>
                                    )}
                                 </div>
                              ))}
                              {background.type === "gradient" && background.colors.length < 3 && (
                                 <button type="button" onClick={addColorStop} className="mt-2 flex items-center space-x-1 text-sm text-indigo-600 hover:text-indigo-700">
                                    <Plus className="h-4 w-4" /> {t("Admin.addColorStop")}
                                 </button>
                              )}
                           </div>

                           {backgroundPreview && (
                              <div className="mt-2">
                                 <div
                                    className="h-12 w-full rounded-md border border-gray-300"
                                    style={{
                                       background:
                                          background.type === "solid"
                                             ? background.colors[0].color
                                             : `linear-gradient(${
                                                  background.direction === "to-r"
                                                     ? "to right"
                                                     : background.direction === "to-l"
                                                     ? "to left"
                                                     : background.direction === "to-t"
                                                     ? "to top"
                                                     : background.direction === "to-b"
                                                     ? "to bottom"
                                                     : background.direction === "to-tr"
                                                     ? "to top right"
                                                     : background.direction === "to-tl"
                                                     ? "to top left"
                                                     : background.direction === "to-br"
                                                     ? "to bottom right"
                                                     : "to bottom left"
                                               }, ${background.colors
                                                  .sort((a, b) => a.position - b.position)
                                                  .map((stop) => `${stop.color} ${stop.position}%`)
                                                  .join(", ")})`,
                                    }}
                                 />
                              </div>
                           )}
                        </div>
                     </div>

                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t("Admin.image")}*</label>

                        {!imageUrl ? (
                           <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                              <div className="space-y-1 text-center">
                                 <Camera className="mx-auto h-12 w-12 text-gray-400" />
                                 <div className="flex text-sm text-gray-600">
                                    <label htmlFor="slide-image" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                                       <span>{t("Admin.uploadImage")}</span>
                                       <input id="slide-image" ref={fileInputRef} type="file" className="sr-only" onChange={handleImageSelect} accept="image/*" />
                                    </label>
                                 </div>
                                 <p className="text-xs text-gray-500">{t("Admin.imageTypes")}</p>
                              </div>
                           </div>
                        ) : (
                           <div className="mt-1 relative">
                              <div className="relative h-32 w-32 mx-auto">
                                 <Image src={imageUrl} alt="Slide image preview" className="h-full w-full object-contain rounded-md" width={128} height={128} />
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
                        disabled={isSaving}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                     >
                        {isSaving ? t("Admin.saving") : editSlide ? t("Admin.saveChanges") : t("Admin.saveSlide")}
                     </button>
                  </div>
               </form>
            </div>
         </div>
      </div>
   );
};

export default AddSlideModal;
