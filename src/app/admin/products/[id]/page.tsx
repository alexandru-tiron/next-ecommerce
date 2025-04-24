"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { db, storage } from "@/lib/firebaseInit";
import { collection, doc, getDoc, updateDoc, deleteDoc, getDocs, setDoc, serverTimestamp, query, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Timestamp } from "firebase/firestore";
import { usePopupContext } from "@/context/PopupContext";
import { ProductBasicInfo, ProductPricing, ProductImages, ProductDescription, VariantsList, SKUVariantsList, CategoryModal, SubcategoryModal, BrandModal } from "@/components/admin/products";
import { Product, Variant, SkuVariant, VARIANT_TYPE, SKUVARIANT_TYPE, Category } from "@/types/product";
import Image from "next/image";
import { getCategData } from "@/queries";
import { useTranslations } from "next-intl";
type EditPageParams = {
   params: Promise<{ id: string }> | { id: string };
};

export default function EditProductPage({ params }: EditPageParams) {
   const  t  = useTranslations();
   const router = useRouter();
   const paramValues = use(params as unknown as Promise<{ id: string }>) as { id: string };
   const productId = paramValues.id;
   const [categories, setCategories] = useState<Category[]>([]);
   const { setPopup } = usePopupContext();

   // Loading and error states
   const [isLoading, setIsLoading] = useState<boolean>(true);
   const [isSaving, setIsSaving] = useState<boolean>(false);
   const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
   const [selectedImages, setSelectedImages] = useState<File[]>([]);
   const [existingImages, setExistingImages] = useState<string[]>([]);
   const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
   const [previewUrls, setPreviewUrls] = useState<string[]>([]);
   const [errors, setErrors] = useState<Record<string, string>>({});
   const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());
   const [originalProductData, setOriginalProductData] = useState<Record<string, unknown>>({});
   const [imagesReordered, setImagesReordered] = useState<boolean>(false);

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
      category_id: categories[0]?.id || "",
      category_name: categories[0]?.name || "",
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
   const [variantsModified, setVariantsModified] = useState<boolean>(false);
   const [originalVariants, setOriginalVariants] = useState<Partial<Variant>[]>([]);

   // SKU Variants state
   const [skuVariants, setSkuVariants] = useState<Partial<SkuVariant>[]>([]);
   const [skuVariantsModified, setSkuVariantsModified] = useState<boolean>(false);
   const [originalSkuVariants, setOriginalSkuVariants] = useState<Partial<SkuVariant>[]>([]);

   // Fetch product data
   useEffect(() => {
      const fetchCategories = async () => {
         const categories = await getCategData();
         setCategories(categories);
      };
      fetchCategories();
      const fetchProduct = async () => {
         try {
            const productRef = doc(db, "Products", productId);
            const productSnapshot = await getDoc(productRef);

            if (!productSnapshot.exists()) {
               setErrors({ general: t("Admin.productNotFound") });
               setIsLoading(false);
               return;
            }

            const productData = productSnapshot.data() as Product;
            const formattedProductData = {
               name: productData.name || "",
               price: productData.price || 0,
               product_code: productData.product_code || "",
               brand: productData.brand || "",
               category_id: productData.category_id || "",
               category_name: productData.category_name || "",
               subcategory_id: productData.subcategory_id || "",
               subcategory_name: productData.subcategory_name || "",
               short_description: productData.short_description || "",
               long_description: productData.long_description || "",
               product_of_month: productData.product_of_month || false,
               how_to: productData.how_to || "",
               weight: productData.weight || 0,
               stoc: productData.stoc || 0,
               discount: productData.discount || false,
               discount_price: productData.discount_price || 0,
               product_images: productData.product_images || [],
               sold: productData.sold || 0,
            };

            setProductData(formattedProductData);
            setOriginalProductData(formattedProductData);

            // Set existing images
            setExistingImages(productData.product_images || []);

            // Fetch variants
            const variantsRef = collection(db, `Products/${productId}/Variants`);
            const variantsSnapshot = await getDocs(variantsRef);
            const variantsData = variantsSnapshot.docs.map((doc) => ({
               id: doc.id,
               ...doc.data(),
            })) as Partial<Variant>[];
            setVariants(variantsData);
            setOriginalVariants(variantsData);

            // Fetch SKU variants
            const skuVariantsRef = collection(db, `Products/${productId}/SkuVariants`);
            const skuVariantsSnapshot = await getDocs(skuVariantsRef);
            const skuVariantsData = skuVariantsSnapshot.docs.map((doc) => ({
               id: doc.id,
               ...doc.data(),
            })) as Partial<SkuVariant>[];
            setSkuVariants(skuVariantsData);
            setOriginalSkuVariants(skuVariantsData);

            setIsLoading(false);
         } catch (error) {
            console.error("Error fetching product:", error);
            setErrors({ general: t("Admin.errorLoadingProductData") });
            setIsLoading(false);
         }
      };

      fetchProduct();
   }, [productId]);

   // Handle image selection
   useEffect(() => {
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
         if (newFiles.length + existingImages.length - imagesToDelete.length < 5) {
            newFiles.push(file);
            newPreviewUrls.push(URL.createObjectURL(file));
         }
      });

      setSelectedImages(newFiles);
      setPreviewUrls(newPreviewUrls);
      setModifiedFields((prev) => new Set(prev).add("product_images"));

      // Clear error when images are added
      if (errors.images && (newFiles.length > 0 || existingImages.length - imagesToDelete.length > 0)) {
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
      setModifiedFields((prev) => new Set(prev).add("product_images"));

      // Set error if all images are removed
      if (newFiles.length === 0 && existingImages.length - imagesToDelete.length === 0) {
         setErrors((prev) => ({ ...prev, images: t("Admin.atLeastOneProductImageRequired") }));
      }
   };

   const handleRemoveExistingImage = (index: number) => {
      const imageUrl = existingImages[index];
      setImagesToDelete((prev) => [...prev, imageUrl]);
      setModifiedFields((prev) => new Set(prev).add("product_images"));

      // Set error if all images are removed
      if (selectedImages.length === 0 && existingImages.length - imagesToDelete.length - 1 === 0) {
         setErrors((prev) => ({ ...prev, images: t("Admin.atLeastOneProductImageRequired") }));
      }
   };

   const handleRestoreImage = (imageUrl: string) => {
      setImagesToDelete((prev) => prev.filter((url) => url !== imageUrl));
      setModifiedFields((prev) => new Set(prev).add("product_images"));

      // Clear error when images are restored
      if (errors.images && (selectedImages.length > 0 || existingImages.length - imagesToDelete.length + 1 > 0)) {
         setErrors((prev) => ({ ...prev, images: "" }));
      }
   };

   const handleReorderImages = (newOrder: { urls: string[] }) => {
      // In edit mode, we're reordering the existing images
      setExistingImages(newOrder.urls.filter((url) => !url.startsWith("blob:")));
      setImagesReordered(true);
      setModifiedFields((prev) => new Set(prev).add("product_images"));
   };

   const handleReorderNewImages = ({ files }: { files?: File[]; urls: string[] }) => {
      if (!files) return;

      // First revoke all existing object URLs to prevent memory leaks
      previewUrls.forEach((url) => {
         if (url.startsWith("blob:")) {
            URL.revokeObjectURL(url);
         }
      });

      // Create fresh object URLs for the files in their new order
      const freshUrls = files.map((file) => URL.createObjectURL(file));

      // Update state with the new files and fresh URLs
      setSelectedImages(files);
      setPreviewUrls(freshUrls);
      setModifiedFields((prev) => new Set(prev).add("product_images"));
   };

   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target as HTMLInputElement;

      if (type === "checkbox") {
         const { checked } = e.target as HTMLInputElement;
         setProductData((prev) => ({ ...prev, [name]: checked }));
         setModifiedFields((prev) => new Set(prev).add(name));
      } else if (type === "number") {
         const numValue = parseFloat(value) || 0;
         setProductData((prev) => ({ ...prev, [name]: numValue }));

         // Only mark as modified if the value actually changed
         if (originalProductData[name] !== numValue) {
            setModifiedFields((prev) => new Set(prev).add(name));
         }
      } else {
         setProductData((prev) => ({ ...prev, [name]: value }));

         // Only mark as modified if the value actually changed
         if (originalProductData[name] !== value) {
            setModifiedFields((prev) => new Set(prev).add(name));
         }
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
         setModifiedFields((prev) => {
            const newSet = new Set(prev);
            newSet.add("category_id");
            newSet.add("category_name");
            newSet.add("subcategory_id");
            newSet.add("subcategory_name");
            return newSet;
         });
      } else {
         setProductData((prev) => ({
            ...prev,
            category_id: "",
            category_name: "",
            subcategory_id: "",
            subcategory_name: "",
         }));
         setModifiedFields((prev) => {
            const newSet = new Set(prev);
            newSet.add("category_id");
            newSet.add("category_name");
            newSet.add("subcategory_id");
            newSet.add("subcategory_name");
            return newSet;
         });
      }

      if (errors.category_id) {
         setErrors((prev) => ({ ...prev, category_id: "" }));
      }
   };

   // Variant handlers
   const handleAddVariant = () => {
      setVariants([...variants, { name: "", type: VARIANT_TYPE.COLOUR }]);
      setVariantsModified(true);
   };

   const handleRemoveVariant = (index: number) => {
      setVariants(variants.filter((_, i) => i !== index));
      setVariantsModified(true);
   };

   const handleVariantChange = (index: number, field: string, value: string) => {
      const updatedVariants = [...variants];
      updatedVariants[index] = { ...updatedVariants[index], [field]: value };
      setVariants(updatedVariants);
      setVariantsModified(true);
   };

   // SKU Variant handlers
   const handleAddSKUVariant = () => {
      setSkuVariants([...skuVariants, { name: "", type: SKUVARIANT_TYPE.LITERS, price: 0 }]);
      setSkuVariantsModified(true);
   };

   const handleRemoveSKUVariant = (index: number) => {
      setSkuVariants(skuVariants.filter((_, i) => i !== index));
      setSkuVariantsModified(true);
   };

   const handleSKUVariantChange = (index: number, field: string, value: string | number | boolean) => {
      const updatedSkuVariants = [...skuVariants];
      updatedSkuVariants[index] = { ...updatedSkuVariants[index], [field]: value };
      setSkuVariants(updatedSkuVariants);
      setSkuVariantsModified(true);
   };

   // Handle variant image upload
   const handleVariantImageUpload = async (variantIndex: number, file: File) => {
      if (!file) return;

      try {
         // Create a reference to the storage location
         const fileRef = ref(storage, `Products/${productId}/${Date.now()}_${file.name}`);

         // Upload the file
         await uploadBytes(fileRef, file, {
            cacheControl: "public, max-age=2678400",
         });

         // Get the download URL
         const downloadUrl = await getDownloadURL(fileRef);

         // Update the variant with the media URL
         const updatedVariants = [...variants];
         updatedVariants[variantIndex] = {
            ...updatedVariants[variantIndex],
            media: downloadUrl,
         };

         setVariants(updatedVariants);
         setVariantsModified(true);
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
         setModifiedFields((prev) => new Set(prev).add("price"));
      }
   }, [skuVariants, calculateLowestPrice]);

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

      if (selectedImages.length === 0 && existingImages.length - imagesToDelete.length === 0) {
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

   const uploadImages = async () => {
      const uploadedUrls: string[] = [];

      for (const file of selectedImages) {
         const fileRef = ref(storage, `Products/${productId}/${Date.now()}_${file.name}`);
         await uploadBytes(fileRef, file, {
            cacheControl: "public, max-age=2678400",
         });
         const downloadUrl = await getDownloadURL(fileRef);
         uploadedUrls.push(downloadUrl);
      }

      return uploadedUrls;
   };

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
         window.scrollTo({ top: 0, behavior: "smooth" });
         return;
      }

      setIsSaving(true);

      try {
         // Only update if there are modified fields, new images, or images to delete, or reordered images
         const hasChanges = modifiedFields.size > 0 || selectedImages.length > 0 || imagesToDelete.length > 0 || imagesReordered || variantsModified || skuVariantsModified;

         if (!hasChanges) {
            // No changes to save
            router.push("/admin/products");
            return;
         }

         // Handle images only if they've been modified
         let updatedImages = [...existingImages];
         if (modifiedFields.has("product_images") || selectedImages.length > 0 || imagesToDelete.length > 0 || imagesReordered) {
            // Delete marked images
            for (const imageUrl of imagesToDelete) {
               try {
                  // Extract the path from the full URL
                  const imagePath = imageUrl.split("/o/")[1].split("?")[0];
                  const imageRef = ref(storage, decodeURIComponent(imagePath));
                  await deleteObject(imageRef);
               } catch (error) {
                  console.error("Error deleting image:", error);
                  // Continue with the rest of the update even if an image deletion fails
               }
            }

            // Upload new images
            const newImageUrls = await uploadImages();

            // Keep existing images that weren't marked for deletion
            const keptImages = existingImages.filter((url) => !imagesToDelete.includes(url));

            // Combine kept images with new ones
            updatedImages = [...keptImages, ...newImageUrls];
         }

         const productRef = doc(db, "Products", productId);

         // Prepare the updated product data only with modified fields
         // Using a separate typed object to build our update data
         const updatedProductData: Record<string, unknown> = {
            updated_at: serverTimestamp() as Timestamp,
         };

         // Add only modified fields
         for (const field of modifiedFields) {
            if (field === "product_images") {
               updatedProductData.product_images = updatedImages;
            } else if (field === "discount_price") {
               // Only include discount_price if discount is enabled
               if (productData.discount) {
                  updatedProductData.discount_price = productData.discount_price;
               } else {
                  updatedProductData.discount_price = false; // Firebase will remove this field
               }
            } else if (field in productData) {
               // Using a type assertion with keyof
               const typedField = field as keyof typeof productData;
               updatedProductData[field] = productData[typedField];
            }
         }

         // Update the product document only if there are fields to update
         if (Object.keys(updatedProductData).length > 1) {
            if (updatedProductData.product_of_month) {
               const oldProductOfMonth = await getDocs(query(collection(db, "Products"), where("product_of_month", "==", true)));
               for (const doc of oldProductOfMonth.docs) {
                  await updateDoc(doc.ref, { product_of_month: false });
               }
            }
            // Cast to any to bypass the type issue with Firestore
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await updateDoc(productRef, updatedProductData as any);
         }

         // Update variants if modified
         if (variantsModified) {
            const variantsRef = collection(db, `Products/${productId}/Variants`);

            // Identify variants by their ID
            const currentVariantIds = variants.map((v) => v.id).filter(Boolean);

            // Find variants to delete (exist in original but not in current)
            const variantsToDelete = originalVariants.filter((v) => v.id && !currentVariantIds.includes(v.id));

            // Delete removed variants
            for (const variant of variantsToDelete) {
               if (variant.id) {
                  await deleteDoc(doc(variantsRef, variant.id));
               }
            }

            // Update or add variants
            for (const variant of variants) {
               const cleanedVariant = cleanObjectFields(variant);
               if (cleanedVariant.id) delete cleanedVariant["id"];
               // Skip if variant doesn't have required fields
               if (!cleanedVariant.name || !cleanedVariant.type) continue;

               if (variant.id) {
                  // This is an existing variant - update it
                  await updateDoc(doc(variantsRef, variant.id), cleanedVariant);
               } else {
                  // This is a new variant - add it
                  await setDoc(doc(variantsRef), cleanedVariant);
               }
            }
         }

         // Update SKU variants if modified
         if (skuVariantsModified) {
            const skuVariantsRef = collection(db, `Products/${productId}/SkuVariants`);

            // Identify SKU variants by their ID
            const currentSkuVariantIds = skuVariants.map((v) => v.id).filter(Boolean);

            // Find SKU variants to delete (exist in original but not in current)
            const skuVariantsToDelete = originalSkuVariants.filter((v) => v.id && !currentSkuVariantIds.includes(v.id));

            // Delete removed SKU variants
            for (const skuVariant of skuVariantsToDelete) {
               if (skuVariant.id) {
                  await deleteDoc(doc(skuVariantsRef, skuVariant.id));
               }
            }

            // Update or add SKU variants
            for (const skuVariant of skuVariants) {
               const cleanedSkuVariant = cleanObjectFields(skuVariant);
               if (cleanedSkuVariant.id) delete cleanedSkuVariant["id"];
               // Skip if SKU variant doesn't have required fields
               if (!cleanedSkuVariant.name || !cleanedSkuVariant.type || cleanedSkuVariant.price === undefined) continue;

               if (skuVariant.id) {
                  // This is an existing SKU variant - update it
                  await updateDoc(doc(skuVariantsRef, skuVariant.id), cleanedSkuVariant);
               } else {
                  // This is a new SKU variant - add it
                  await setDoc(doc(skuVariantsRef), cleanedSkuVariant);
               }
            }
         }

         // Navigate back to products page after successful save
         router.push("/admin/products");
      } catch (error) {
         console.error("Error updating product:", error);
         setIsSaving(false);
      }
   };

   const confirmDeleteProduct = () => {
      setPopup({
         title: t("Admin.deleteProduct"),
         description: [<p key="delete-msg">{t("Admin.deleteProductConfirmation")}</p>],
         buttons: [
            {
               label: t("Admin.cancel"),
               onClick: () => setPopup(null),
               className: "secondary",
            },
            {
               label: deleteLoading ? t("Admin.deleting") : t("Admin.deleteProduct"),
               onClick: () => handleDeleteProduct(),
               className: "primary",
            },
         ],
      });
   };

   const handleDeleteProduct = async () => {
      try {
         setDeleteLoading(true);

         // Delete product images from storage
         for (const imageUrl of existingImages) {
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

         // Delete variants subcollection
         const variantsRef = collection(db, `Products/${productId}/Variants`);
         const variantsSnapshot = await getDocs(variantsRef);
         for (const doc of variantsSnapshot.docs) {
            await deleteDoc(doc.ref);
         }

         // Delete sku variants subcollection
         const skuVariantsRef = collection(db, `Products/${productId}/SkuVariants`);
         const skuVariantsSnapshot = await getDocs(skuVariantsRef);
         for (const doc of skuVariantsSnapshot.docs) {
            await deleteDoc(doc.ref);
         }

         // Delete the main product document
         await deleteDoc(doc(db, "Products", productId));

         // Close the confirmation modal
         setPopup(null);

         // Navigate back to products page
         router.push("/admin/products");
      } catch (error) {
         console.error("Error deleting product:", error);
         setDeleteLoading(false);
         setPopup({
            title: t("Admin.error"),
            description: [<p key="error-msg">{t("Admin.deleteProductError")}</p>],
            buttons: [
               {
                  label: t("Admin.understand"),
                  onClick: () => {},
                  className: "primary",
               },
            ],
         });
      }
   };

   if (isLoading) {
      return (
         <div className="flex justify-center items-center h-64">
            <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
         </div>
      );
   }

   return (
      <div className="space-y-6">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
            <div className="flex items-center space-x-4">
               <Link href="/admin/products" className="p-1 rounded-full hover:bg-gray-100">
                  <ArrowLeft className="w-5 h-5 text-gray-500" />
               </Link>
               <div>
                  <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">{t("Admin.editProduct")}</h1>
                  <p className="mt-1 text-sm text-gray-500">{t("Admin.updateProductInformation")}</p>
               </div>
            </div>
            <button type="button" onClick={confirmDeleteProduct} className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-red-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
               {t("Admin.deleteProduct")}
            </button>
         </div>

         <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 sm:p-6 space-y-6">
               {/* Basic Information */}
               <ProductBasicInfo
                  productData={productData as unknown as Product}
                  errors={errors}
                  handleInputChange={handleInputChange}
                  handleCategoryChange={handleCategoryChange}
                  onOpenCategoryModal={() => setShowCategoryModal(true)}
                  onOpenSubcategoryModal={() => setShowSubcategoryModal(true)}
                  onOpenBrandModal={() => setShowBrandModal(true)}
               />

               {/* Product Images */}
               <div className="pt-4 border-t border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">{t("Admin.productImages")}</h2>

                  {/* Existing images with reordering */}
                  {existingImages.length > 0 && (
                     <div className="mb-4">
                        <h3 className="text-xs font-medium text-gray-700 mb-1">{t("Admin.currentImages")}</h3>
                        <ProductImages
                           selectedImages={[]}
                           previewUrls={existingImages.filter((url) => !imagesToDelete.includes(url))}
                           errors={errors}
                           handleImageSelect={handleImageSelect}
                           handleRemoveImage={handleRemoveExistingImage}
                           handleReorderImages={handleReorderImages}
                           isExistingImages={true}
                        />

                        {/* Deleted images */}
                        {imagesToDelete.length > 0 && (
                           <div className="mt-4">
                              <h3 className="text-xs font-medium text-gray-700 mb-1">{t("Admin.removedImages")}</h3>
                              <div className="flex flex-wrap gap-2">
                                 {imagesToDelete.map((imageUrl, index) => (
                                    <div key={index} className="relative">
                                       <div className="w-16 h-16 overflow-hidden rounded border border-gray-200 opacity-40">
                                          <Image src={imageUrl} alt={`Removed ${index + 1}`} width={64} height={64} className="object-cover w-full h-full" />
                                       </div>
                                       <button type="button" onClick={() => handleRestoreImage(imageUrl)} className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 text-white text-xs">
                                          Restore
                                       </button>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        )}
                     </div>
                  )}

                  {/* New images */}
                  <div className="mt-4">
                     <h3 className="text-xs font-medium text-gray-700 mb-1">{t("Admin.addNewImages")}</h3>
                     <ProductImages selectedImages={selectedImages} previewUrls={previewUrls} errors={errors} handleImageSelect={handleImageSelect} handleRemoveImage={handleRemoveImage} handleReorderImages={handleReorderNewImages} />
                  </div>
               </div>

               {/* Product Description */}
               <ProductDescription productData={productData as unknown as Product} errors={errors} handleInputChange={handleInputChange} />

               {/* Product Pricing & Inventory */}
               <ProductPricing productData={productData as unknown as Product} errors={errors} handleInputChange={handleInputChange} isPriceDisabled={skuVariants.length > 0} />

               {/* Product Variants */}
               <VariantsList variants={variants} onAddVariant={handleAddVariant} onRemoveVariant={handleRemoveVariant} onVariantChange={handleVariantChange} onVariantImageUpload={handleVariantImageUpload} />

               {/* SKU Variants */}
               <SKUVariantsList skuVariants={skuVariants} onAddSKUVariant={handleAddSKUVariant} onRemoveSKUVariant={handleRemoveSKUVariant} onSKUVariantChange={handleSKUVariantChange} />
            </div>

            <div className="border-t border-gray-200 px-4 py-4 sm:px-6 flex flex-col sm:flex-row sm:justify-end gap-3">
               <Link href="/admin/products" className="w-full sm:w-auto text-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  {t("Admin.cancel")}
               </Link>
               <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full sm:w-auto px-4 py-2 bg-indigo-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center justify-center disabled:bg-indigo-400"
               >
                  {isSaving ? (
                     <>
                        <Loader2 className="animate-spin w-4 h-4 mr-2" /> {t("Admin.saving")}
                     </>
                  ) : (
                     t("Admin.updateProduct")
                  )}
               </button>
            </div>
         </form>

         <CategoryModal isOpen={showCategoryModal} onClose={() => setShowCategoryModal(false)} />

         <SubcategoryModal isOpen={showSubcategoryModal} onClose={() => setShowSubcategoryModal(false)} categoryId={productData.category_id} categoryName={productData.category_name} />

         <BrandModal isOpen={showBrandModal} onClose={() => setShowBrandModal(false)} />
      </div>
   );
}
