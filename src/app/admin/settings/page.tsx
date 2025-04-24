"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebaseInit";
import { doc, getDoc, deleteDoc, collection, onSnapshot, setDoc } from "firebase/firestore";
import { Save, RefreshCw, AlertTriangle, Plus, Trash2, Camera } from "lucide-react";
import { Info, Notifications, Shipping, Slide } from "@/types/user";
import { useSearchParams, useRouter } from "next/navigation";
import { TabsContent, TabsList, TabsTrigger, Tabs } from "@/components/common/tabs";
import CategoryModal from "@/components/admin/products/modals/CategoryModal";
import SubcategoryModal from "@/components/admin/products/modals/SubcategoryModal";
import BrandModal from "@/components/admin/products/modals/BrandModal";
import { getCategData, getBrandData, refreshCategData, refreshBrandData } from "@/queries";
import Image from "next/image";
import AddSlideModal from "@/components/admin/settings/AddSlideModal";
import { Category, Brand } from "@/types/product";
import { useTranslations } from "next-intl";
interface FirebaseSlide extends Slide {
   id: string;
}

export default function SettingsPage() {
   const t = useTranslations();
   const [isLoading, setIsLoading] = useState(true);
   const [isSaving, setIsSaving] = useState(false);
   const [saveMessage, setSaveMessage] = useState<{ type: string; message: string } | null>(null);

   const searchParams = useSearchParams();
   const router = useRouter();
   const tabParam = searchParams.get("tab");

   const [activeTab, setActiveTab] = useState("general");
   const [categ, setCateg] = useState<Category[]>([]);
   const [brands, setBrands] = useState<Brand[]>([]);
   const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({});

   // Modals state
   const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
   const [isAddSubcategoryModalOpen, setIsAddSubcategoryModalOpen] = useState(false);
   const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
   const [selectedCategoryName, setSelectedCategoryName] = useState<string | undefined>(undefined);
   const [isAddBrandModalOpen, setIsAddBrandModalOpen] = useState(false);

   // State for each settings document
   const [infoSettings, setInfoSettings] = useState<Info>({
      store_name: process.env.NEXT_PUBLIC_STORE_NAME || "",
      store_address: process.env.NEXT_PUBLIC_STORE_ADDRESS || "",
      phone_no: process.env.NEXT_PUBLIC_STORE_PHONE_NO || "",
      contact_mail: process.env.NEXT_PUBLIC_STORE_CONTACT_MAIL || "",
      orders_mail: process.env.NEXT_PUBLIC_STORE_ORDERS_MAIL || "",
      support_mail: process.env.NEXT_PUBLIC_STORE_SUPPORT_MAIL || "",
      facebook_link: "",
      instagram_link: "",
      x_link: " ",
      pinterest_link: "",
   });

   const [sliderSettings, setSliderSettings] = useState<FirebaseSlide[]>([]);
   const [isAddSlideModalOpen, setIsAddSlideModalOpen] = useState(false);
   const [selectedSlide, setSelectedSlide] = useState<FirebaseSlide | null>(null);

   const [shippingSettings, setShippingSettings] = useState<Shipping>({
      default_price: 25,
      enable_threshold: false,
      free_shipping_threshold: 500,
   });

   const [notificationSettings, setNotificationSettings] = useState<Notifications>({
      send_new_order_mails: true,
      send_order_status_update_mails: false,
      send_confirmation_mails: true,
   });

   // Update the active tab when the URL parameter changes
   useEffect(() => {
      if (tabParam && ["general", "shipping", "notifications", "categories"].includes(tabParam)) {
         setActiveTab(tabParam);
      }
   }, [tabParam]);

   // Update URL when active tab changes
   const handleTabChange = (value: string) => {
      setActiveTab(value);
      router.push(`/admin/settings?tab=${value}`, { scroll: false });
   };

   // Toggle expanded state for a category
   const toggleCategory = (categoryId: string) => {
      setExpandedCategories((prev) => ({
         ...prev,
         [categoryId]: !prev[categoryId],
      }));
   };

   useEffect(() => {
      const fetchCategories = async () => {
         const categories = await getCategData();
         setCateg(categories);
      };
      fetchCategories();

      const fetchBrands = async () => {
         const brands = await getBrandData();
         setBrands(brands);
      };
      fetchBrands();

      const fetchSettings = async () => {
         try {
            setIsLoading(true);

            // Fetch Info settings
            const infoDoc = await getDoc(doc(db, "Settings", "Info"));
            if (infoDoc.exists()) {
               setInfoSettings(infoDoc.data() as Info);
            }

            // Fetch Shipping settings
            const shippingDoc = await getDoc(doc(db, "Settings", "Shipping"));
            if (shippingDoc.exists()) {
               setShippingSettings(shippingDoc.data() as Shipping);
            }

            // Fetch Notification settings
            const notificationsDoc = await getDoc(doc(db, "Settings", "Notifications"));
            if (notificationsDoc.exists()) {
               setNotificationSettings(notificationsDoc.data() as Notifications);
            }

            setIsLoading(false);
         } catch (error) {
            console.error("Error fetching settings:", error);
            setIsLoading(false);
            setSaveMessage({
               type: "error",
               message: t("Admin.failedToLoadSettings"),
            });
         }
      };
      // Fetch Slider settings
      const sliderUnsub = onSnapshot(collection(db, "Settings", "Info", "Slider"), (snapshot) => {
         const sliderDocs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as FirebaseSlide));
         setSliderSettings(sliderDocs);
      });
      fetchSettings();
      return () => sliderUnsub();
   }, []);

   // Handle input changes for Info settings
   const handleInfoChange = (field: keyof Info, value: string) => {
      setInfoSettings((prev) => ({
         ...prev,
         [field]: value,
      }));
   };

   // Handle input changes for Shipping settings
   const handleShippingChange = (field: keyof Shipping, value: number | boolean) => {
      setShippingSettings((prev) => ({
         ...prev,
         [field]: value,
      }));
   };

   // Handle input changes for Notification settings
   const handleNotificationChange = (field: keyof Notifications, value: boolean) => {
      setNotificationSettings((prev) => ({
         ...prev,
         [field]: value,
      }));
   };

   // Add after the handleSliderChange function
   const handleEditSlide = (slide: FirebaseSlide) => {
      setSelectedSlide(slide);
      setIsAddSlideModalOpen(true);
   };

   // Save settings to Firestore
   const saveSettings = async () => {
      try {
         setIsSaving(true);

         // Update each settings document
         await setDoc(doc(db, "Settings", "Info"), infoSettings, { merge: true });
         await setDoc(doc(db, "Settings", "Shipping"), shippingSettings, { merge: true });
         await setDoc(doc(db, "Settings", "Notifications"), notificationSettings, { merge: true });

         setSaveMessage({
            type: "success",
            message: t("Admin.settingsSavedSuccessfully"),
         });

         setTimeout(() => {
            setSaveMessage(null);
         }, 3000);
      } catch (error) {
         console.error("Error saving settings:", error);

         setSaveMessage({
            type: "error",
            message: t("Admin.failedToSaveSettings", { error: (error as Error).message || "Unknown error" }),
         });

         setTimeout(() => {
            setSaveMessage(null);
         }, 3000);
      } finally {
         setIsSaving(false);
      }
   };

   const handleAddSubcategory = (categoryId: string, categoryName: string) => {
      setSelectedCategoryId(categoryId);
      setSelectedCategoryName(categoryName);
      setIsAddSubcategoryModalOpen(true);
   };

   const handleDeleteItem = async (type: "category" | "subcategory" | "brand" | "slider", id: string, parentId?: string) => {
      if (!confirm(t("Admin.confirmDelete", { type: t(`Admin.${type}`) }))) return;

      try {
         setIsSaving(true);

         if (type === "category") {
            await deleteDoc(doc(db, "Categories", id));
         } else if (type === "subcategory" && parentId) {
            await deleteDoc(doc(db, "Categories", parentId, "Subcategories", id));
         } else if (type === "brand") {
            await deleteDoc(doc(db, "Brands", id));
         } else if (type === "slider") {
            await deleteDoc(doc(db, "Settings", "Info", "Slider", id));
         }

         await refreshCategData(setCateg);
         await refreshBrandData(setBrands);

         setSaveMessage({
            type: "success",
            message: t("Admin.itemDeletedSuccessfully", { type: t(`Admin.${type}`) }),
         });

         setTimeout(() => {
            setSaveMessage(null);
         }, 3000);
      } catch (error) {
         console.error(`Error deleting ${type}:`, error);
         setSaveMessage({
            type: "error",
            message: t("Admin.failedToDeleteItem", { type: t(`Admin.${type}`) }),
         });
      } finally {
         setIsSaving(false);
      }
   };

   if (isLoading) {
      return (
         <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
         </div>
      );
   }

   return (
      <div className="space-y-6">
         <div className="flex justify-between items-center">
            <div>
               <h1 className="text-2xl font-semibold text-gray-900">{t("Admin.settings")}</h1>
               <p className="mt-1 text-sm text-gray-500 hidden md:block">{t("Admin.manageSettings")}</p>
            </div>

            <button
               onClick={saveSettings}
               disabled={isSaving}
               className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
               {isSaving ? (
                  <>
                     <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                     {t("Profile.saving")}
                  </>
               ) : (
                  <>
                     <Save className="w-4 h-4 mr-2" />
                     {t("Profile.save")}
                  </>
               )}
            </button>
         </div>

         {/* Save message */}
         {saveMessage && (
            <div className={`p-4 rounded-md ${saveMessage.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
               <div className="flex">
                  <div className="flex-shrink-0">
                     {saveMessage.type === "success" ? (
                        <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                     ) : (
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                     )}
                  </div>
                  <div className="ml-3">
                     <p className="text-sm font-medium">{saveMessage.type === "success" ? t("Admin.settingsSaved") : saveMessage.message.includes("Failed to load settings") ? t("Admin.settingsFailedToLoad") : saveMessage.message}</p>
                  </div>
               </div>
            </div>
         )}

         {/* Settings using Tabs component */}
         <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
               <TabsList className="w-full flex border-b border-gray-200 overflow-x-auto scrollbar-hide">
                  <TabsTrigger value="general" className={`whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm ${activeTab === "general" ? "border-black text-black" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>
                     {t("Admin.general")}
                  </TabsTrigger>
                  <TabsTrigger value="shipping" className={`whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm ${activeTab === "shipping" ? "border-black text-black" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>
                     {t("Admin.shipping")}
                  </TabsTrigger>
                  <TabsTrigger value="notifications" className={`whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm ${activeTab === "notifications" ? "border-black text-black" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>
                     {t("Admin.notifications")}
                  </TabsTrigger>
                  <TabsTrigger value="slider" className={`whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm ${activeTab === "slider" ? "border-black text-black" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>
                     {t("Admin.slider")}
                  </TabsTrigger>
                  <TabsTrigger value="categories" className={`whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm ${activeTab === "categories" ? "border-black text-black" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>
                     {t("Admin.categories")}
                  </TabsTrigger>
               </TabsList>

               <TabsContent value="general" className="p-6">
                  {/* General Settings (Info) */}
                  <div className="space-y-6">
                     <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                           <label htmlFor="storeName" className="block text-sm font-medium text-gray-700">
                              {t("Admin.storeName")}
                           </label>
                           <input type="text" id="storeName" value={infoSettings.store_name} onChange={(e) => handleInfoChange("store_name", e.target.value)} className="mt-1 px-3 py-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                        </div>

                        <div>
                           <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">
                              {t("Admin.contactEmail")}
                           </label>
                           <input
                              type="email"
                              id="contactEmail"
                              value={infoSettings.contact_mail}
                              onChange={(e) => handleInfoChange("contact_mail", e.target.value)}
                              className="mt-1 px-3 py-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                           />
                        </div>

                        <div>
                           <label htmlFor="ordersEmail" className="block text-sm font-medium text-gray-700">
                              {t("Admin.ordersEmail")}
                           </label>
                           <input type="email" id="ordersEmail" value={infoSettings.orders_mail} onChange={(e) => handleInfoChange("orders_mail", e.target.value)} className="mt-1 px-3 py-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                        </div>

                        <div>
                           <label htmlFor="supportEmail" className="block text-sm font-medium text-gray-700">
                              {t("Admin.supportEmail")}
                           </label>
                           <input
                              type="email"
                              id="supportEmail"
                              value={infoSettings.support_mail}
                              onChange={(e) => handleInfoChange("support_mail", e.target.value)}
                              className="mt-1 px-3 py-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                           />
                        </div>

                        <div>
                           <label htmlFor="storePhone" className="block text-sm font-medium text-gray-700">
                              {t("Admin.storePhone")}
                           </label>
                           <input type="text" id="storePhone" value={infoSettings.phone_no} onChange={(e) => handleInfoChange("phone_no", e.target.value)} className="mt-1 px-3 py-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                        </div>

                        <div>
                           <label htmlFor="storeAddress" className="block text-sm font-medium text-gray-700">
                              {t("Admin.storeAddress")}
                           </label>
                           <input
                              type="text"
                              id="storeAddress"
                              value={infoSettings.store_address}
                              onChange={(e) => handleInfoChange("store_address", e.target.value)}
                              className="mt-1 px-3 py-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                           />
                        </div>

                        <div>
                           <label htmlFor="facebookLink" className="block text-sm font-medium text-gray-700">
                              {t("Admin.facebookLink")}
                           </label>
                           <input
                              type="text"
                              id="facebookLink"
                              value={infoSettings.facebook_link || ""}
                              onChange={(e) => handleInfoChange("facebook_link", e.target.value)}
                              className="mt-1 px-3 py-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                           />
                        </div>

                        <div>
                           <label htmlFor="instagramLink" className="block text-sm font-medium text-gray-700">
                              {t("Admin.instagramLink")}
                           </label>
                           <input
                              type="text"
                              id="instagramLink"
                              value={infoSettings.instagram_link || ""}
                              onChange={(e) => handleInfoChange("instagram_link", e.target.value)}
                              className="mt-1 px-3 py-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                           />
                        </div>

                        <div>
                           <label htmlFor="xLink" className="block text-sm font-medium text-gray-700">
                              {t("Admin.xLink")}
                           </label>
                           <input type="text" id="xLink" value={infoSettings.x_link || ""} onChange={(e) => handleInfoChange("x_link", e.target.value)} className="mt-1 px-3 py-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                        </div>

                        <div>
                           <label htmlFor="pinterestLink" className="block text-sm font-medium text-gray-700">
                              {t("Admin.pinterestLink")}
                           </label>
                           <input
                              type="text"
                              id="pinterestLink"
                              value={infoSettings.pinterest_link || ""}
                              onChange={(e) => handleInfoChange("pinterest_link", e.target.value)}
                              className="mt-1 px-3 py-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                           />
                        </div>
                     </div>
                  </div>
               </TabsContent>

               <TabsContent value="shipping" className="p-6">
                  {/* Shipping Settings */}
                  <div className="space-y-6">
                     <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                           <label htmlFor="defaultShippingPrice" className="block text-sm font-medium text-gray-700">
                              {t("Admin.defaultShippingPrice")}
                           </label>
                           <input
                              type="number"
                              id="defaultShippingPrice"
                              value={shippingSettings.default_price}
                              onChange={(e) => handleShippingChange("default_price", parseFloat(e.target.value))}
                              className="mt-1 px-3 py-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                           />
                        </div>

                        <div className="flex items-center">
                           <input type="checkbox" id="enableThreshold" checked={shippingSettings.enable_threshold} onChange={(e) => handleShippingChange("enable_threshold", e.target.checked)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                           <label htmlFor="enableThreshold" className="ml-2 block text-sm text-gray-700">
                              {t("Admin.enableThreshold")}
                           </label>
                        </div>

                        <div>
                           <label htmlFor="freeShippingThreshold" className="block text-sm font-medium text-gray-700">
                              {t("Admin.freeShippingThreshold")}
                           </label>
                           <input
                              type="number"
                              id="freeShippingThreshold"
                              value={shippingSettings.free_shipping_threshold}
                              disabled={!shippingSettings.enable_threshold}
                              onChange={(e) => handleShippingChange("free_shipping_threshold", parseFloat(e.target.value))}
                              className="mt-1 px-3 py-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                           />
                           <p className="mt-1 text-xs text-gray-500">{t("Admin.freeShippingThresholdLabel")}</p>
                        </div>
                     </div>
                  </div>
               </TabsContent>

               <TabsContent value="notifications" className="p-6">
                  {/* Notification Settings */}
                  <div className="space-y-6">
                     <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-center">
                           <input type="checkbox" id="sendNewOrderEmails" checked={notificationSettings.send_new_order_mails} onChange={(e) => handleNotificationChange("send_new_order_mails", e.target.checked)} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                           <label htmlFor="sendNewOrderEmails" className="ml-2 block text-sm text-gray-700">
                              {t("Admin.sendNewOrderEmails")}
                           </label>
                        </div>

                        <div className="flex items-center">
                           <input
                              type="checkbox"
                              id="sendOrderStatusUpdateEmails"
                              checked={notificationSettings.send_order_status_update_mails}
                              onChange={(e) => handleNotificationChange("send_order_status_update_mails", e.target.checked)}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                           />
                           <label htmlFor="sendOrderStatusUpdateEmails" className="ml-2 block text-sm text-gray-700">
                              {t("Admin.sendOrderStatusUpdateEmails")}
                           </label>
                        </div>

                        <div className="flex items-center">
                           <input
                              type="checkbox"
                              id="sendConfirmationEmails"
                              checked={notificationSettings.send_confirmation_mails}
                              onChange={(e) => handleNotificationChange("send_confirmation_mails", e.target.checked)}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                           />
                           <label htmlFor="sendConfirmationEmails" className="ml-2 block text-sm text-gray-700">
                              {t("Admin.sendConfirmationEmails")}
                           </label>
                        </div>
                     </div>
                  </div>
               </TabsContent>

               <TabsContent value="slider" className="p-6">
                  {/* Slider Settings */}
                  <div className="space-y-6">
                     <div className="flex items-center justify-between mb-6">
                        <div>
                           <h3 className="text-lg font-medium text-gray-900">{t("Admin.slider")}</h3>
                           <p className="mt-1 text-sm text-gray-500">{t("Admin.manageSlider")}</p>
                        </div>
                        <button
                           onClick={() => setIsAddSlideModalOpen(true)}
                           className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                        >
                           <Plus className="h-4 w-4 mr-1" /> {t("Admin.addSlider")}
                        </button>
                     </div>
                     <div className="grid grid-cols-1 gap-8">
                        {sliderSettings.map((slide) => {
                           let background;
                           if (slide.background) {
                              const isGradient = slide.background.includes("gradient");
                              if (isGradient) {
                                 const direction = slide.background.match(/gradient-to-(r|l|t|b|tr|tl|br|bl)/)?.[1] || "r";
                                 const colors = slide.background.match(/\[([^\]]+)\]/g)?.map((color) => color.slice(1, -1)) || [];
                                 background = {
                                    type: "gradient",
                                    direction: `to-${direction}`,
                                    colors: colors.map((color, index) => ({
                                       color,
                                       position: index === 0 ? 0 : index === colors.length - 1 ? 100 : 50,
                                    })),
                                 };
                              } else {
                                 const color = slide.background.match(/\[([^\]]+)\]/)?.[1] || "#000000";
                                 background = {
                                    type: "solid",
                                    direction: "to-r",
                                    colors: [{ color, position: 0 }],
                                 };
                              }
                           }

                           return (
                              <div key={slide.id} className="bg-white p-6 rounded-lg border border-gray-200 space-y-6">
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Image Section */}
                                    <div className="md:col-span-1">
                                       <label className="block text-sm font-medium text-gray-700 mb-2">{t("Admin.image")}</label>
                                       <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                                          {slide.image ? (
                                             <Image src={slide.image} alt={slide.title} className="object-cover" fill sizes="(max-width: 768px) 100vw, 33vw" />
                                          ) : (
                                             <div className="flex h-full items-center justify-center">
                                                <Camera className="h-12 w-12 text-gray-300" />
                                             </div>
                                          )}
                                       </div>
                                    </div>

                                    {/* Content Section */}
                                    <div className="md:col-span-2 space-y-4">
                                       <div>
                                          <label htmlFor={"sliderTitle_" + slide.id} className="block text-sm font-medium text-gray-700 mb-1">
                                             {t("Admin.title")}*
                                          </label>
                                          <input type="text" id={"sliderTitle_" + slide.id} value={slide.title} disabled={true} className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                                       </div>

                                       <div>
                                          <label htmlFor={"sliderDescription_" + slide.id} className="block text-sm font-medium text-gray-700 mb-1">
                                             {t("Admin.description")}
                                          </label>
                                          <textarea
                                             id={"sliderDescription_" + slide.id}
                                             value={slide.description || ""}
                                             disabled={true}
                                             rows={2}
                                             className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                          />
                                       </div>

                                       <div>
                                          <label htmlFor={"sliderUrl_" + slide.id} className="block text-sm font-medium text-gray-700 mb-1">
                                             {t("Admin.url")}
                                          </label>
                                          <input
                                             type="text"
                                             id={"sliderUrl_" + slide.id}
                                             value={slide.url || ""}
                                             disabled={true}
                                             className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                             placeholder="URL slide (optional)"
                                          />
                                       </div>

                                       {background && (
                                          <div>
                                             <label className="block text-sm font-medium text-gray-700 mb-1">{t("Admin.background")}</label>
                                             <div className="h-12 w-full rounded-md border border-gray-300 overflow-hidden">
                                                <div
                                                   className="h-full"
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
                                          </div>
                                       )}
                                    </div>
                                 </div>

                                 <div className="flex justify-end space-x-3 pt-2">
                                    <button
                                       onClick={() => handleEditSlide(slide)}
                                       className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                       {t("Admin.edit")}
                                    </button>
                                    <button
                                       onClick={() => handleDeleteItem("slider", slide.id)}
                                       className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                    >
                                       <Trash2 className="h-4 w-4 mr-1" />
                                       {t("Admin.delete")}
                                    </button>
                                 </div>
                              </div>
                           );
                        })}
                        {sliderSettings.length === 0 && (
                           <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                              <div className="text-gray-500">{t("Admin.noSliders")}</div>
                           </div>
                        )}
                     </div>
                  </div>
               </TabsContent>

               <TabsContent value="categories" className="p-6">
                  {/* Categories Management */}
                  <div className="space-y-4">
                     <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-medium text-gray-900">{t("Admin.categories")}</h3>
                        <div className="flex space-x-2">
                           <button
                              onClick={() => setIsAddCategoryModalOpen(true)}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                           >
                              <Plus className="h-4 w-4 mr-1" /> {t("Admin.addCategory")}
                           </button>
                           <button
                              onClick={() => setIsAddBrandModalOpen(true)}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                           >
                              <Plus className="h-4 w-4 mr-1" /> {t("Admin.addBrand")}
                           </button>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        {/* Categories and Subcategories */}
                        <div className="md:col-span-8 space-y-4">
                           <h4 className="font-medium text-gray-700">{t("Admin.category")}</h4>
                           <div className="border rounded-md divide-y">
                              {categ.length === 0 ? (
                                 <div className="p-4 text-center text-gray-500">{t("Admin.noCategories")}</div>
                              ) : (
                                 categ.map((category) => (
                                    <div key={category.id} className="p-4">
                                       <div className="flex justify-between items-center">
                                          <div className="flex items-center">
                                             <button onClick={() => toggleCategory(category.id)} className="mr-2 text-gray-500 hover:text-gray-700">
                                                {expandedCategories[category.id] ? (
                                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                                   </svg>
                                                ) : (
                                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                   </svg>
                                                )}
                                             </button>
                                             <div className="flex items-center">
                                                {category.icon && <Image src={category.icon} width={20} height={20} alt={category.name} className="mr-2" />}
                                                <span className="font-medium">{category.name}</span>
                                             </div>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                             <button onClick={() => handleAddSubcategory(category.id, category.name)} className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                                                <Plus className="h-3 w-3 mr-1" /> {t("Admin.addSubcategory")}
                                             </button>
                                             <button onClick={() => handleDeleteItem("category", category.id)} className="p-1 rounded-md hover:bg-red-50 text-red-600" title={t("Admin.deleteCategory")}>
                                                <Trash2 className="h-4 w-4" />
                                             </button>
                                          </div>
                                       </div>

                                       {/* Subcategories */}
                                       {expandedCategories[category.id] && (
                                          <div className="mt-2 ml-8 pl-4 border-l-2 border-gray-100 space-y-2">
                                             {category.subcategories?.length === 0 ? (
                                                <div className="text-sm text-gray-500 py-2">{t("Admin.noSubcategories")}</div>
                                             ) : (
                                                category.subcategories?.map((subcategory) => (
                                                   <div key={subcategory.id} className="flex justify-between items-center py-2">
                                                      <div className="flex items-center">
                                                         {subcategory.icon && <Image width={16} height={16} src={subcategory.icon} alt={subcategory.name} className="mr-2" />}
                                                         <span className="text-sm">{subcategory.name}</span>
                                                      </div>
                                                      <div className="flex items-center space-x-1">
                                                         <button onClick={() => handleDeleteItem("subcategory", subcategory.id, category.id)} className="p-1 rounded-md hover:bg-red-50 text-red-600" title={t("Admin.deleteSubcategory")}>
                                                            <Trash2 className="h-3 w-3" />
                                                         </button>
                                                      </div>
                                                   </div>
                                                ))
                                             )}
                                          </div>
                                       )}
                                    </div>
                                 ))
                              )}
                           </div>
                        </div>

                        {/* Brands */}
                        <div className="md:col-span-4 space-y-4">
                           <h4 className="font-medium text-gray-700">{t("Admin.brands")}</h4>
                           <div className="border rounded-md p-4">
                              <div className="grid grid-cols-1 gap-3">
                                 {brands.length === 0 ? (
                                    <div className="text-center text-gray-500">{t("Admin.noBrands")}</div>
                                 ) : (
                                    brands.map((brand) => (
                                       <div key={brand.id} className="flex justify-between items-center p-2 border-b last:border-b-0">
                                          <div className="flex items-center">
                                             {brand.image && <Image src={brand.image} width={24} height={24} alt={brand.name} className="object-contain mr-2" />}
                                             <span className="text-sm">{brand.name}</span>
                                          </div>
                                          <button onClick={() => handleDeleteItem("brand", brand.id)} className="p-1 rounded-md hover:bg-red-50 text-red-600" title={t("Admin.deleteBrand")}>
                                             <Trash2 className="h-3 w-3" />
                                          </button>
                                       </div>
                                    ))
                                 )}
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </TabsContent>
            </Tabs>
         </div>

         {/* Modals */}
         <CategoryModal isOpen={isAddCategoryModalOpen} onClose={() => setIsAddCategoryModalOpen(false)} />
         <SubcategoryModal isOpen={isAddSubcategoryModalOpen} onClose={() => setIsAddSubcategoryModalOpen(false)} categoryId={selectedCategoryId} categoryName={selectedCategoryName} />
         <BrandModal isOpen={isAddBrandModalOpen} onClose={() => setIsAddBrandModalOpen(false)} />
         <AddSlideModal
            isOpen={isAddSlideModalOpen}
            onClose={() => {
               setIsAddSlideModalOpen(false);
               setSelectedSlide(null);
            }}
            editSlide={selectedSlide}
         />
      </div>
   );
}
