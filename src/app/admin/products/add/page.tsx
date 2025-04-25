"use client";

import React, { useState, useEffect, useCallback } from "react";
import { db, storage } from "@/lib/firebaseInit";
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Timestamp } from "firebase/firestore";
import { usePopupContext } from "@/context/PopupContext";
import { ProductBasicInfo, ProductPricing, ProductImages, ProductDescription, VariantsList, SKUVariantsList, CategoryModal, SubcategoryModal, BrandModal } from "@/components/admin/products";
import { Product, Variant, SkuVariant, VARIANT_TYPE, SKUVARIANT_TYPE, Category } from "@/types/product";
import { getCategData } from "@/queries";
import { useTranslations } from "next-intl";

export default function AddProductPage() {
   const t = useTranslations();
   const router = useRouter();
   const [categories, setCategories] = useState<Category[]>([]);
   const { setPopup } = usePopupContext();

   // Loading and error states
   const [isSaving, setIsSaving] = useState(false);
   const [selectedImages, setSelectedImages] = useState<File[]>([]);
   const [previewUrls, setPreviewUrls] = useState<string[]>([]);
   const [errors, setErrors] = useState<Record<string, string>>({});

   // Modal states
   const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
   const [showSubcategoryModal, setShowSubcategoryModal] = useState<boolean>(false);
   const [showBrandModal, setShowBrandModal] = useState<boolean>(false);

   // Product form data
   const [productData, setProductData] = useState<Partial<Product>>({
      name: "",
      price: 0,
      product_code: "",
      brand: "",
      category_id: "",
      category_name: "",
      subcategory_id: "",
      subcategory_name: "",
      short_description: "",
      long_description: "",
      how_to: "",
      weight: 0,
      stoc: 12,
      discount: false,
      discount_price: 0,
      product_images: [] as string[],
      sold: 0,
   });

   // Variants state
   const [variants, setVariants] = useState<Partial<Variant>[]>([]);

   // SKU Variants state
   const [skuVariants, setSkuVariants] = useState<Partial<SkuVariant>[]>([]);

   // Handle image selection
   useEffect(() => {
      const fetchCategories = async () => {
         const categories = await getCategData();
         setCategories(categories);
      };
      fetchCategories();
      // Clean up previous preview URLs when selected images change
      return () => {
         previewUrls.forEach((url) => URL.revokeObjectURL(url));
      };
   }, [previewUrls]);

   const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;

      const filesArray = Array.from(e.target.files);
      const newFiles = [...selectedImages];
      const newPreviewUrls = [...previewUrls];

      filesArray.forEach((file) => {
         if (newFiles.length < 5) {
            newFiles.push(file);
            newPreviewUrls.push(URL.createObjectURL(file));
         }
      });

      setSelectedImages(newFiles);
      setPreviewUrls(newPreviewUrls);

      // Clear error when images are added
      if (errors.images && newFiles.length > 0) {
         setErrors((prev) => ({ ...prev, images: "" }));
      }
   };

   const handleRemoveImage = (index: number) => {
      const newFiles = selectedImages.filter((_, i) => i !== index);

      // Revoke the URL of the removed image preview
      URL.revokeObjectURL(previewUrls[index]);

      const newPreviewUrls = previewUrls.filter((_, i) => i !== index);

      setSelectedImages(newFiles);
      setPreviewUrls(newPreviewUrls);

      // Set error if all images are removed
      if (newFiles.length === 0) {
         setErrors((prev) => ({ ...prev, images: t("Admin.atLeastOneProductImageRequired") }));
      }
   };

   const handleReorderImages = ({ files, urls }: { files?: File[]; urls: string[] }) => {
      // First revoke all existing object URLs to prevent memory leaks
      previewUrls.forEach((url) => {
         if (url.startsWith("blob:")) {
            URL.revokeObjectURL(url);
         }
      });

      // Create fresh object URLs for the files in their new order
      const freshUrls = files ? files.map((file) => URL.createObjectURL(file)) : urls;

      // Update state with the new files and fresh URLs
      setSelectedImages(files || []);
      setPreviewUrls(freshUrls);
   };

   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target as HTMLInputElement;

      if (type === "checkbox") {
         const { checked } = e.target as HTMLInputElement;
         setProductData((prev) => ({ ...prev, [name]: checked }));
      } else if (type === "number") {
         setProductData((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
      } else {
         setProductData((prev) => ({ ...prev, [name]: value }));
      }

      // Clear error when field is modified
      if (errors[name]) {
         setErrors((prev) => ({ ...prev, [name]: "" }));
      }
   };

   const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const categoryId = e.target.value;

      // Find the selected category
      const category = categories.find((cat) => cat.id === categoryId);

      if (category) {
         setProductData((prev) => ({
            ...prev,
            category_id: category.id,
            category_name: category.name,
            subcategory_id: "",
            subcategory_name: "",
         }));
      } else {
         setProductData((prev) => ({
            ...prev,
            category_id: "",
            category_name: "",
            subcategory_id: "",
            subcategory_name: "",
         }));
      }

      if (errors.category_id) {
         setErrors((prev) => ({ ...prev, category_id: "" }));
      }
   };

   // Variant handlers
   const handleAddVariant = () => {
      setVariants([...variants, { name: "", type: VARIANT_TYPE.COLOUR }]);
   };

   const handleRemoveVariant = (index: number) => {
      setVariants(variants.filter((_, i) => i !== index));
   };

   const handleVariantChange = (index: number, field: string, value: string) => {
      const updatedVariants = [...variants];
      updatedVariants[index] = { ...updatedVariants[index], [field]: value };
      setVariants(updatedVariants);
   };

   // SKU Variant handlers
   const handleAddSKUVariant = () => {
      setSkuVariants([...skuVariants, { name: "", type: SKUVARIANT_TYPE.LITERS, price: 0 }]);
   };

   const handleRemoveSKUVariant = (index: number) => {
      setSkuVariants(skuVariants.filter((_, i) => i !== index));
   };

   const handleSKUVariantChange = (index: number, field: string, value: string | number | boolean) => {
      const updatedSkuVariants = [...skuVariants];
      updatedSkuVariants[index] = { ...updatedSkuVariants[index], [field]: value };
      setSkuVariants(updatedSkuVariants);
   };

   // Handle variant image upload
   const handleVariantImageUpload = async (variantIndex: number, file: File) => {
      if (!file) return;

      try {
         // Generate a temporary ID for the product if we don't have one yet
         // This is just for organizing uploads - the actual product ID will be generated on save
         const tempProductId = productData.id || `temp_${Date.now()}`;

         // Create a reference to the storage location
         const fileRef = ref(storage, `Products/${tempProductId}/${Date.now()}_${file.name}`);

         // Upload the file
         await uploadBytes(fileRef, file, { contentType: file.type, cacheControl: "public,max-age=2678400" });

         // Get the download URL
         const downloadUrl = await getDownloadURL(fileRef);

         // Update the variant with the media URL
         const updatedVariants = [...variants];
         updatedVariants[variantIndex] = {
            ...updatedVariants[variantIndex],
            media: downloadUrl,
         };

         setVariants(updatedVariants);
      } catch (error) {
         console.error("Error uploading variant image:", error);
         // You could add error handling here, like showing a toast notification
      }
   };

   // Calculate the lowest price from SKU variants
   const calculateLowestPrice = useCallback(() => {
      if (skuVariants.length === 0) return productData.price;

      const prices = skuVariants
         .map((variant) => {
            if (variant.discount && variant.discount_price) {
               return variant.discount_price;
            }
            return variant.price;
         })
         .filter((price) => price !== undefined && price !== null) as number[];

      return prices.length > 0 ? Math.min(...prices) : productData.price;
   }, [skuVariants, productData.price]);

   // Update product price when SKU variants change
   useEffect(() => {
      if (skuVariants.length > 0) {
         const lowestPrice = calculateLowestPrice();
         setProductData((prev) => ({
            ...prev,
            price: lowestPrice,
         }));
      }
   }, [skuVariants, calculateLowestPrice]);

   const validateForm = () => {
      const newErrors: Record<string, string> = {};

      if (!productData.name?.trim()) {
         newErrors.name = t("Admin.productNameRequired");
      }
      if (!productData.product_code?.trim()) {
         newErrors.product_code = t("Admin.productCodeRequired");
      }

      if (!productData.price || productData.price <= 0) {
         newErrors.price = t("Admin.priceRequired");
      }

      if (productData.discount && (!productData.discount_price || productData.discount_price <= 0)) {
         newErrors.discount_price = t("Admin.discountPriceRequired");
      }

      if (productData.discount && productData.discount_price && productData.price && productData.discount_price >= productData.price) {
         newErrors.discount_price = t("Admin.discountPriceMustBeLowerThanRegularPrice");
      }

      if (!productData.category_id || !productData.category_name) {
         newErrors.category_id = t("Admin.categoryRequired");
      }
      if (!productData.subcategory_id || !productData.subcategory_name) {
         newErrors.subcategory_id = t("Admin.subcategoryRequired");
      }

      if (!selectedImages.length) {
         newErrors.images = t("Admin.atLeastOneProductImageRequired");
      }

      if (!productData.short_description?.trim()) {
         newErrors.short_description = t("Admin.shortDescriptionRequired");
      }

      if (!productData.weight || productData.weight <= 0) {
         newErrors.weight = t("Admin.weightRequired");
      }

      if (!productData.brand) {
         newErrors.brand = t("Admin.brandRequired");
      }

      setErrors(newErrors);

      // If there are errors, show the first one in the popup
      if (Object.keys(newErrors).length > 0) {
         const firstError = Object.values(newErrors)[0];
         setPopup({
            title: t("Admin.error"),
            description: [<p key="error-msg">{firstError}</p>],
            buttons: [
               {
                  label: t("Admin.understand"),
                  onClick: () => {},
                  className: "primary",
               },
            ],
         });
         return false;
      }

      return true;
   };

   async function uploadImages(productId: string) {
      const uploadedUrls: string[] = [];

      for (const file of selectedImages) {
         const fileRef = ref(storage, `Products/${productId}/${Date.now()}_${file.name}`);
         await uploadBytes(fileRef, file, { contentType: file.type, cacheControl: "public,max-age=2678400" });
         const downloadUrl = await getDownloadURL(fileRef);
         uploadedUrls.push(downloadUrl);
      }

      return uploadedUrls;
   }

   // Add this helper function before the handleSubmit function
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   const cleanObjectFields = <T extends Record<string, any>>(obj: T): Partial<T> => {
      const cleanedObj: Partial<T> = {};

      Object.entries(obj).forEach(([key, value]) => {
         // Skip empty strings, null, undefined values
         if (value === null || value === undefined) return;
         if (typeof value === "string" && value.trim() === "") return;

         // For numbers, keep 0 values for price fields since they're important
         // but skip 0 for other numeric fields if needed
         if (typeof value === "number" && value === 0 && !["price", "discount_price", "stoc"].includes(key)) return;

         // Keep boolean values (with type assertion)
         if (typeof value === "boolean") {
            cleanedObj[key as keyof T] = value as T[keyof T];
            return;
         }

         // Recursively clean nested objects
         if (typeof value === "object" && !Array.isArray(value) && value !== null) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cleanedNested = cleanObjectFields(value as Record<string, any>);
            if (Object.keys(cleanedNested).length > 0) {
               cleanedObj[key as keyof T] = cleanedNested as T[keyof T];
            }
         } else {
            cleanedObj[key as keyof T] = value;
         }
      });

      return cleanedObj;
   };

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
         window.scrollTo({ top: 0, behavior: "smooth" });
         return;
      }

      setIsSaving(true);

      try {
         // Generate a product ID using Firestore's auto-generated ID
         const ref = doc(collection(db, "Products"));
         const productId = ref.id;
         // Upload product images first
         const productImages = await uploadImages(productId);
         // Prepare the product data with TypeScript partial type
         const newProductData: Partial<Product> = {
            name: productData.name,
            category_name: productData.category_name,
            category_id: productData.category_id,
            subcategory_name: productData.subcategory_name,
            subcategory_id: productData.subcategory_id,
            created_at: serverTimestamp() as Timestamp,
            sold: 0,
            price: productData.price,
            brand: productData.brand,
            product_code: productData.product_code,
            product_images: productImages,
            short_description: productData.short_description,
            ...(productData.long_description?.trim() ? { long_description: productData.long_description } : {}),
            ...(productData.how_to?.trim() ? { how_to: productData.how_to } : {}),
            discount: productData.discount || false,
            ...(productData.discount && productData.discount_price ? { discount_price: productData.discount_price } : {}),
            stoc: productData.stoc || 12,
            weight: productData.weight || 300,
         };

         // Save the main product document
         await setDoc(doc(db, "Products", productId), newProductData);

         // Save variants if any
         if (variants.length > 0) {
            const variantsRef = collection(db, `Products/${productId}/Variants`);
            for (const variant of variants) {
               // Clean the variant object to remove empty fields
               const cleanedVariant = cleanObjectFields(variant);

               // Skip if variant doesn't have required fields
               if (!cleanedVariant.name || !cleanedVariant.type) continue;

               // For new products, we create new documents
               if (variant.id) {
                  // If there's an ID (rare for new products), preserve it
                  await setDoc(doc(variantsRef, variant.id), cleanedVariant);
               } else {
                  // Otherwise create with auto-generated ID
                  await setDoc(doc(variantsRef), cleanedVariant);
               }
            }
         }

         // Save SKU variants if any
         if (skuVariants.length > 0) {
            const skuVariantsRef = collection(db, `Products/${productId}/SkuVariants`);
            for (const skuVariant of skuVariants) {
               // Clean the SKU variant object to remove empty fields
               const cleanedSkuVariant = cleanObjectFields(skuVariant);

               // Skip if SKU variant doesn't have required fields
               if (!cleanedSkuVariant.name || !cleanedSkuVariant.type || cleanedSkuVariant.price === undefined) continue;

               // For new products, we create new documents
               if (skuVariant.id) {
                  // If there's an ID (rare for new products), preserve it
                  await setDoc(doc(skuVariantsRef, skuVariant.id), cleanedSkuVariant);
               } else {
                  // Otherwise create with auto-generated ID
                  await setDoc(doc(skuVariantsRef), cleanedSkuVariant);
               }
            }
         }

         // Navigate back to products page after successful save
         router.push("/admin/products");
      } catch (error) {
         console.error("Error adding product:", error);
         setPopup({
            title: t("Admin.error"),
            description: [<p key="error-msg">{t("Admin.errorAddingProduct")}</p>],
            buttons: [
               {
                  label: t("Admin.understand"),
                  onClick: () => {},
                  className: "primary",
               },
            ],
         });
         setIsSaving(false);
      }
   };

   return (
      <div className="space-y-6">
         <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
               <Link href="/admin/products" className="p-1 rounded-full hover:bg-gray-100">
                  <ArrowLeft className="w-5 h-5 text-gray-500" />
               </Link>
               <div>
                  <h1 className="text-2xl font-semibold text-gray-900">{t("Admin.addProduct")}</h1>
                  <p className="mt-1 text-sm text-gray-500">{t("Admin.createNewProduct")}</p>
               </div>
            </div>
         </div>

         <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 space-y-6">
               {/* Basic Information */}
               <ProductBasicInfo
                  productData={productData as Product}
                  errors={errors}
                  handleInputChange={handleInputChange}
                  handleCategoryChange={handleCategoryChange}
                  onOpenCategoryModal={() => setShowCategoryModal(true)}
                  onOpenSubcategoryModal={() => setShowSubcategoryModal(true)}
                  onOpenBrandModal={() => setShowBrandModal(true)}
               />

               {/* Product Images */}
               <ProductImages selectedImages={selectedImages} previewUrls={previewUrls} errors={errors} handleImageSelect={handleImageSelect} handleRemoveImage={handleRemoveImage} handleReorderImages={handleReorderImages} />

               {/* Product Description */}
               <ProductDescription productData={productData as Product} errors={errors} handleInputChange={handleInputChange} />

               {/* Product Pricing & Inventory */}
               <ProductPricing productData={productData as Product} errors={errors} handleInputChange={handleInputChange} isPriceDisabled={skuVariants.length > 0} />

               {/* Product Variants */}
               <VariantsList variants={variants} onAddVariant={handleAddVariant} onRemoveVariant={handleRemoveVariant} onVariantChange={handleVariantChange} onVariantImageUpload={handleVariantImageUpload} />

               {/* SKU Variants */}
               <SKUVariantsList skuVariants={skuVariants} onAddSKUVariant={handleAddSKUVariant} onRemoveSKUVariant={handleRemoveSKUVariant} onSKUVariantChange={handleSKUVariantChange} />
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
               <div className="flex gap-3">
                  <Link href="/admin/products" className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                     {t("Admin.cancel")}
                  </Link>
                  <button
                     type="submit"
                     disabled={isSaving}
                     className="px-4 py-2 bg-indigo-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center disabled:bg-indigo-400"
                  >
                     {isSaving ? (
                        <>
                           <Loader2 className="animate-spin w-4 h-4 mr-2" /> {t("Admin.saving")}
                        </>
                     ) : (
                        t("Admin.saveProduct")
                     )}
                  </button>
               </div>
            </div>
         </form>

         {/* Modals */}
         {showCategoryModal && <CategoryModal isOpen={showCategoryModal} onClose={() => setShowCategoryModal(false)} />}

         {showSubcategoryModal && <SubcategoryModal isOpen={showSubcategoryModal} onClose={() => setShowSubcategoryModal(false)} categoryId={productData.category_id} categoryName={productData.category_name} />}

         <BrandModal isOpen={showBrandModal} onClose={() => setShowBrandModal(false)} />
      </div>
   );
}
