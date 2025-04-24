"use client";

import { useAuthContext } from "@/context/AuthContext";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TabsContent, TabsList, TabsTrigger, Tabs } from "@/components/common/tabs";
import { MapPin, User, Package } from "lucide-react";

// Import the components
import PersonalInfoSection from "@/components/profile/PersonalInfoSection";
import AddressesSection from "@/components/profile/AddressesSection";
import OrdersSection from "@/components/profile/OrdersSection";
import { useTranslations } from "next-intl";
// Create a loading component
const ProfileLoading = () => {
   const t = useTranslations("Profile");
   return (
      <div className="flex items-center justify-center h-[calc(100vh-180px)]">
         <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-600">{t("loading")}</p>
         </div>
      </div>
   );
};
// Move the main profile content to a separate component
const ProfileContent = () => {
   const { user, isAuthReady } = useAuthContext();
   const searchParams = useSearchParams();
   const router = useRouter();
   const tabParam = searchParams.get("tab");
   const t = useTranslations("Profile");
   const [activeTab, setActiveTab] = useState("personal");

   // Update the active tab when the URL parameter changes
   useEffect(() => {
      if (tabParam && ["personal", "addresses", "orders"].includes(tabParam)) {
         setActiveTab(tabParam);
      }
   }, [tabParam]);

   // Update the URL when the active tab changes
   const handleTabChange = (value: string) => {
      setActiveTab(value);
      router.push(`/profile?tab=${value}`, { scroll: false });
   };

   // Show loading state while checking authentication
   if (!isAuthReady) {
      return (
         <div className="flex items-center justify-center h-[calc(100vh-180px)]">
            <div className="text-center">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
               <p className="text-gray-600">{t("loading")}</p>
            </div>
         </div>
      );
   }

   // Show login prompt if not authenticated
   if (!user) {
      return (
         <div className="flex items-center justify-center h-[calc(100vh-180px)]">
            <div className="text-center">
               <h2 className="text-2xl font-medium mb-4">{t("login")}</h2>
               <p className="text-gray-600 mb-6">{t("loginDescription")}</p>
               <Link href="/login" className="bg-black text-white px-6 py-2 rounded-md hover:bg-opacity-90 transition-colors">
                  {t("loginButton")}
               </Link>
            </div>
         </div>
      );
   }

   return (
      <div className="py-8 px-4 md:px-8 lg:px-16 xl:px-32 2xl:px-64">
         <h1 className="text-xl sm:text-2xl font-medium mb-6 sm:mb-8">{t("myProfile")}</h1>

         <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="w-full flex mb-6 sm:mb-8 border-b border-gray-200 overflow-x-auto scrollbar-hide pb-1">
               <TabsTrigger value="personal" className={`flex items-center gap-2 py-2 px-3 sm:px-4 border-b-2 transition-colors whitespace-nowrap ${activeTab === "personal" ? "border-black text-black" : "border-transparent text-gray-500 hover:text-black"}`}>
                  <User size={16} className="hidden sm:inline" />
                  {t("personalInfo")}
               </TabsTrigger>
               <TabsTrigger value="addresses" className={`flex items-center gap-2 py-2 px-3 sm:px-4 border-b-2 transition-colors whitespace-nowrap ${activeTab === "addresses" ? "border-black text-black" : "border-transparent text-gray-500 hover:text-black"}`}>
                  <MapPin size={16} className="hidden sm:inline" />
                  {t("addresses")}
               </TabsTrigger>
               <TabsTrigger value="orders" className={`flex items-center gap-2 py-2 px-3 sm:px-4 border-b-2 transition-colors whitespace-nowrap ${activeTab === "orders" ? "border-black text-black" : "border-transparent text-gray-500 hover:text-black"}`}>
                  <Package size={16} className="hidden sm:inline" />
                  {t("myOrders")}
               </TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="mt-4">
               <PersonalInfoSection />
            </TabsContent>

            <TabsContent value="addresses" className="mt-4">
               <AddressesSection />
            </TabsContent>

            <TabsContent value="orders" className="mt-4">
               <OrdersSection />
            </TabsContent>
         </Tabs>
      </div>
   );
};

// Main component wrapped in Suspense
const ProfilePage = () => {
   return (
      <Suspense fallback={<ProfileLoading />}>
         <ProfileContent />
      </Suspense>
   );
};

export default ProfilePage;
