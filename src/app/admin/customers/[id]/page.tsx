"use client";

import React, { useState, useEffect, use } from "react";
import { db } from "@/lib/firebaseInit";
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs, Timestamp } from "firebase/firestore";
import { ArrowLeft, User, Calendar, Package, MapPin, Phone, Mail, Building, Key } from "lucide-react";
import Link from "next/link";
import { UserData, Order, Address } from "@/types/user";
import { useRouter } from "next/navigation";
import { CartProduct } from "@/types/product";
import { useAuthContext } from "@/context/AuthContext";
import { useTranslations } from "next-intl";
interface CustomerDetailPageProps {
   params: Promise<{
      id: string;
   }>;
}

// Helper function to convert Firestore timestamp to Date
const toDate = (timestamp: Timestamp | { _seconds: number; _nanoseconds: number }): Date => {
   if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
   }
   return new Date(timestamp._seconds * 1000);
};

export default function CustomerDetailPage({ params }: CustomerDetailPageProps) {
   const resolvedParams = use(params) as { id: string };
   const t = useTranslations();
   const router = useRouter();
   const { handleResetPassword } = useAuthContext();
   const [isLoading, setIsLoading] = useState(true);
   const [customer, setCustomer] = useState<UserData | null>(null);
   const [recentOrders, setRecentOrders] = useState<Order[]>([]);
   const [addresses, setAddresses] = useState<Address[]>([]);
   const [totalOrders, setTotalOrders] = useState(0);
   const [totalSpent, setTotalSpent] = useState(0);

   useEffect(() => {
      const fetchCustomerData = async () => {
         try {
            setIsLoading(true);

            // Fetch customer data
            const customerDoc = await getDoc(doc(db, "Users", resolvedParams.id));
            if (!customerDoc.exists()) {
               console.error("Customer not found");
               router.push("/admin/customers");
               return;
            }
            const customerData = customerDoc.data() as UserData;
            setCustomer(customerData);

            // Fetch recent orders
            const ordersRef = collection(db, "Orders");
            const ordersQuery = query(ordersRef, where("user_id", "==", resolvedParams.id), orderBy("date", "desc"), limit(5));
            const ordersSnapshot = await getDocs(ordersQuery);
            const orders = ordersSnapshot.docs.map((doc) => ({
               id: doc.id,
               ...doc.data(),
            })) as Order[];
            setRecentOrders(orders);

            // Fetch total orders count
            const allOrdersQuery = query(ordersRef, where("user_id", "==", resolvedParams.id));
            const allOrdersSnapshot = await getDocs(allOrdersQuery);
            setTotalOrders(allOrdersSnapshot.size);

            // Calculate total spent
            const total = allOrdersSnapshot.docs.reduce((sum, doc) => {
               const order = doc.data();
               let orderTotal = 0;
               if (order.products && Array.isArray(order.products)) {
                  orderTotal = order.products.reduce((productSum: number, product: CartProduct) => {
                     const price = product.discount_price || product.product_price;
                     return productSum + price * (product.quantity || 1);
                  }, 0);
               }
               if (order.shipping_price) {
                  orderTotal += order.shipping_price;
               }
               return sum + orderTotal;
            }, 0);
            setTotalSpent(total);

            // Fetch addresses
            const addressesRef = collection(db, "Users", resolvedParams.id, "Addresses");
            const addressesSnapshot = await getDocs(addressesRef);
            const addressesData = addressesSnapshot.docs.map((doc) => ({
               id: doc.id,
               ...doc.data(),
            })) as Address[];
            setAddresses(addressesData);

            setIsLoading(false);
         } catch (error) {
            console.error("Error fetching customer data:", error);
            setIsLoading(false);
         }
      };

      fetchCustomerData();
   }, [resolvedParams.id, router]);

   if (isLoading) {
      return (
         <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
         </div>
      );
   }

   if (!customer) {
      return (
         <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">{t("Admin.customerNotFound")}</h1>
            <Link href="/admin/customers" className="text-indigo-600 hover:text-indigo-900">
               {t("Admin.backToCustomers")}
            </Link>
         </div>
      );
   }

   return (
      <div className="space-y-6">
         {/* Header */}
         <div className="flex items-center">
            <Link href="/admin/customers" className="text-gray-500 hover:text-gray-700 mr-4">
               <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
               <h1 className="text-2xl font-semibold text-gray-900">
                  {customer.first_name} {customer.last_name}
               </h1>
               <p className="mt-1 text-sm text-gray-500">{t("Admin.customerDetails")}</p>
            </div>
         </div>

         {/* Customer Information */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
               <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2 text-gray-500" />
                  {t("Admin.basicInfo")}
               </h2>
               <div className="space-y-3">
                  <div className="flex items-center">
                     <Mail className="w-4 h-4 text-gray-400 mr-2" />
                     <span className="text-gray-600">
                        <a href={`mailto:${customer.email}`} className="text-indigo-600 hover:text-indigo-900">
                           {customer.email}
                        </a>
                     </span>
                  </div>
                  {customer.phone_no && (
                     <div className="flex items-center">
                        <Phone className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-gray-600">{customer.phone_no}</span>
                     </div>
                  )}
                  <div className="flex items-center">
                     <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                     <span className="text-gray-600">
                        {t("Admin.memberSince")}{" "}
                        {customer.created_at
                           ? toDate(customer.created_at).toLocaleDateString("ro-RO", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                             })
                           : "N/A"}
                     </span>
                  </div>
                  <button onClick={() => handleResetPassword(customer.email)} className="flex items-center text-sm text-indigo-600 hover:text-indigo-900 mt-2">
                     <Key className="w-4 h-4 mr-2" />
                     {t("Admin.resetPassword")}
                  </button>
               </div>
            </div>

            {/* Order Statistics */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
               <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Package className="w-5 h-5 mr-2 text-gray-500" />
                  {t("Admin.orderStatistics")}
               </h2>
               <div className="space-y-3">
                  <div className="flex justify-between">
                     <span className="text-gray-600">{t("Admin.totalOrders")}:</span>
                     <span className="font-medium">{totalOrders}</span>
                  </div>
                  <div className="flex justify-between">
                     <span className="text-gray-600">{t("Admin.totalSpent")}:</span>
                     <span className="font-medium">{totalSpent.toFixed(2)} Lei</span>
                  </div>
                  {recentOrders.length > 0 && (
                     <div className="flex justify-between">
                        <span className="text-gray-600">{t("Admin.lastOrder")}:</span>
                        <span className="font-medium">
                           {recentOrders[0].date
                              ? toDate(recentOrders[0].date).toLocaleDateString("ro-RO", {
                                   day: "2-digit",
                                   month: "2-digit",
                                   year: "numeric",
                                })
                              : "N/A"}
                        </span>
                     </div>
                  )}
               </div>
            </div>
         </div>

         {/* Recent Orders */}
         <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
               <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Package className="w-5 h-5 mr-2 text-gray-500" />
                  {t("Admin.recentOrders")}
               </h2>
               {recentOrders.length > 0 ? (
                  <div className="space-y-4">
                     {recentOrders.map((order) => (
                        <div key={order.id} className="border-b border-gray-200 pb-4 last:border-0">
                           <div className="flex justify-between items-start">
                              <div>
                                 <Link href={`/admin/orders/${order.id}`} className="text-indigo-600 hover:text-indigo-900">
                                    {t("Admin.order")} {order.id}
                                 </Link>
                                 <p className="text-sm text-gray-500">
                                    {order.date
                                       ? toDate(order.date).toLocaleDateString("ro-RO", {
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "numeric",
                                         })
                                       : "N/A"}
                                 </p>
                              </div>
                              <div className="text-right">
                                 <span className="font-medium">{(order.products.reduce((sum, product) => sum + (product.discount_price || product.product_price) * (product.quantity || 1), 0) + order.shipping_price).toFixed(2)} Lei</span>
                                 <p className="text-sm text-gray-500 capitalize">
                                    {order.status === "pending" && t("Orders.pending")}
                                    {order.status === "accepted" && t("Orders.accepted")}
                                    {order.status === "rejected" && t("Orders.rejected")}
                                    {order.status === "shipped" && t("Orders.shipped")}
                                    {order.status === "delivered" && t("Orders.delivered")}
                                    {!order.status && t("Orders.pending")}
                                 </p>
                              </div>
                           </div>
                           <div className="mt-2">
                              <p className="text-sm text-gray-600">
                                 {order.products.length} {order.products.length === 1 ? t("Admin.product") : t("Admin.products")}
                              </p>
                           </div>
                        </div>
                     ))}
                  </div>
               ) : (
                  <p className="text-gray-500">{t("Admin.noOrders")}</p>
               )}
            </div>
         </div>

         {/* Addresses */}
         <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
               <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-gray-500" />
                  {t("Admin.savedAddresses")}
               </h2>
               {addresses.length > 0 ? (
                  <div className="space-y-4">
                     {addresses.map((address) => (
                        <div key={address.id} className="border-b border-gray-200 pb-4 last:border-0">
                           <div className="flex justify-between items-start">
                              <div>
                                 <p className="font-medium">
                                    {t("Addresses.streetShort")} {address.street} {address.street_no}, {t("Addresses.cityShort")} {address.city}
                                 </p>
                                 <p className="text-sm text-gray-500">
                                    {address.apartment ? t("Addresses.apartmentShort") + " " + address.apartment + " " : ""} {address.building ? t("Addresses.buildingShort") + " " + address.building + " " : ""} {address.building_no ? t("Addresses.buildingNoShort") + " " + address.building_no + " " : ""} {address.floor ? t("Addresses.floorShort") + " " + address.floor + " " : ""}{" "}
                                    {address.intercom ? t("Addresses.intercomShort") + " " + address.intercom + " " : ""} {address.details ? t("Addresses.details") + ": " + address.details : ""}
                                 </p>
                                 <p className="text-sm text-gray-500">
                                    {t("Addresses.countyShort")} {address.county}, {t("Addresses.postalCodeShort")} {address.postal_code}
                                 </p>
                              </div>
                              {address.business && (
                                 <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                                    <Building className="w-4 h-4 text-gray-400 mr-2" />
                                    <span className="text-gray-600">{t("Addresses.business")}</span>
                                    <p className="text-sm text-gray-500">
                                       {address.business_details?.name} {address.business_details?.reg_no ? t("Addresses.businessRegNoShort") + " " + address.business_details?.reg_no : ""} {address.business_details?.cui ? t("Addresses.businessCuiShort") + " " + address.business_details?.cui : ""}{" "}
                                       {address.business_details?.iban ? t("Addresses.businessIbanShort") + " " + address.business_details?.iban : ""} {address.business_details?.bank ? t("Addresses.businessBankShort") + " " + address.business_details?.bank : ""}
                                    </p>
                                 </span>
                              )}
                           </div>
                        </div>
                     ))}
                  </div>
               ) : (
                  <p className="text-gray-500">{t("Admin.noAddresses")}</p>
               )}
            </div>
         </div>
      </div>
   );
}
