"use client";

import React, { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebaseInit";
import { collection, getDocs, query, where, orderBy, limit, updateDoc, doc, getDoc, startAfter, DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { Eye, Filter, ArrowUp, ArrowDown, Check, X, Truck, Package } from "lucide-react";
import Link from "next/link";
import { Order } from "@/types/user";
import { Timestamp } from "firebase/firestore";
import { useTranslations } from "next-intl";
// Extended order type with customer information
interface ExtendedOrder extends Order {
   customerName: string;
   customerEmail: string;
   totalAmount: number;
}

// Add timestamp helper at the top of the file
const getTimestampSeconds = (timestamp: Timestamp | { _seconds: number; _nanoseconds: number }) => {
   return "seconds" in timestamp ? timestamp.seconds : timestamp._seconds;
};

export default function OrdersPage() {
   const t = useTranslations();
   const [isLoading, setIsLoading] = useState(true);
   const [initialLoad, setInitialLoad] = useState(true);
   const [orders, setOrders] = useState<ExtendedOrder[]>([]);
   const [currentPage, setCurrentPage] = useState(1);
   const [sortField, setSortField] = useState<string>("date");
   const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
   const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
   const [trackingNumberInput, setTrackingNumberInput] = useState<{ [orderId: string]: string }>({});
   const [isUpdating, setIsUpdating] = useState<{ [orderId: string]: boolean }>({});
   const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
   const [hasMore, setHasMore] = useState(true);

   const itemsPerPage = 50;

   // Reset pagination when status filter changes
   useEffect(() => {
      setCurrentPage(1);
      setLastVisible(null);
   }, [selectedStatus]);

   // Main data fetching effect
   useEffect(() => {
      const fetchOrders = async () => {
         try {
            setIsLoading(true);
            console.log("Fetching orders data from Firestore...");

            // Create base query for orders
            const ordersRef = collection(db, "Orders");
            let ordersQuery = query(ordersRef, orderBy(sortField, sortDirection));

            // Apply status filter if selected
            if (selectedStatus) {
               ordersQuery = query(ordersQuery, where("status", "==", selectedStatus));
            }

            // Apply pagination
            if (lastVisible && currentPage > 1) {
               ordersQuery = query(ordersQuery, startAfter(lastVisible), limit(itemsPerPage));
            } else {
               ordersQuery = query(ordersQuery, limit(itemsPerPage));
            }

            const querySnapshot = await getDocs(ordersQuery);

            // Process the orders data
            await processOrders(querySnapshot.docs);
            setIsLoading(false);
            setInitialLoad(false);
         } catch (error) {
            console.error("Error fetching orders:", error);
            setIsLoading(false);
            setInitialLoad(false);
         }
      };

      // Helper function to process order documents
      const processOrders = async (orderDocs: QueryDocumentSnapshot<DocumentData>[]) => {
         // Update last visible document
         setLastVisible(orderDocs[orderDocs.length - 1] || null);
         setHasMore(orderDocs.length === itemsPerPage);

         // Process the orders data
         const ordersData: ExtendedOrder[] = [];

         for (const orderDoc of orderDocs) {
            const orderData = orderDoc.data() as Order;

            // Add the document ID as the order ID if it's not already there
            const order: Order = {
               ...orderData,
               id: orderDoc.id,
            };

            // Get user data to include customer information
            let customerName = "Unknown Customer";
            let customerEmail = "unknown@example.com";

            try {
               if (orderData.user_id) {
                  const userDoc = await getDoc(doc(db, "Users", orderData.user_id));
                  if (userDoc.exists()) {
                     const userData = userDoc.data();
                     customerName = `${userData.first_name || ""} ${userData.last_name || ""}`.trim() || "Unknown Customer";
                     customerEmail = userData.email || "unknown@example.com";
                  }
               }
            } catch (error) {
               console.error("Error fetching user data:", error);
            }

            // Calculate total amount
            let totalAmount = 0;

            if (order.products && Array.isArray(order.products)) {
               totalAmount = order.products.reduce((sum, product) => {
                  const price = product.discount_price || product.product_price;
                  return sum + price * (product.quantity || 1);
               }, 0);
            }

            // Add shipping price to total if it exists
            if (order.shipping_price) {
               totalAmount += order.shipping_price;
            }

            // Create the extended order with customer info
            const extendedOrder: ExtendedOrder = {
               ...order,
               customerName,
               customerEmail,
               totalAmount,
               // Ensure we have a valid Timestamp object for date
               date: order.date || Timestamp.now(),
               // Ensure we have a status
               status: order.status || "pending",
            };

            ordersData.push(extendedOrder);
         }

         // Update orders state
         if (currentPage === 1 || selectedStatus) {
            setOrders(ordersData);
         } else {
            setOrders((prev) => [...prev, ...ordersData]);
         }
      };

      fetchOrders();
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [currentPage, selectedStatus, sortField, sortDirection]);

   // Get unique statuses for filter
   const statuses = ["pending", "accepted", "shipped", "delivered", "rejected"];
   const statusesRO = [t("Orders.pending"), t("Orders.accepted"), t("Orders.shipped"), t("Orders.delivered"), t("Orders.rejected")];

   // Handle load more
   const handleLoadMore = () => {
      if (!isLoading && hasMore) {
         setCurrentPage((prev) => prev + 1);
      }
   };

   // Format date
   const formatDate = (timestamp: Timestamp | { _seconds: number; _nanoseconds: number }) => {
      if (!timestamp) return "Unknown date";

      try {
         const seconds = getTimestampSeconds(timestamp);
         const date = new Date(seconds * 1000);
         return date.toLocaleDateString("ro-RO", {
            year: "numeric",
            month: "long",
            day: "numeric",
         });
      } catch (error) {
         console.error("Error formatting date:", error);
         return "Date error";
      }
   };

   // Update order status
   const updateOrderStatus = async (orderId: string, newStatus: Order["status"]) => {
      try {
         setIsUpdating((prev) => ({ ...prev, [orderId]: true }));

         // Update in Firestore
         const orderRef = doc(db, "Orders", orderId);
         await updateDoc(orderRef, { status: newStatus });

         // Update local state
         setOrders((prevOrders) => prevOrders.map((order) => (order.id === orderId ? { ...order, status: newStatus } : order)));

         setIsUpdating((prev) => ({ ...prev, [orderId]: false }));
      } catch (error) {
         console.error("Error updating order status:", error);
         setIsUpdating((prev) => ({ ...prev, [orderId]: false }));
      }
   };

   // Update tracking number
   const updateTrackingNumber = async (orderId: string) => {
      try {
         const trackingNumber = trackingNumberInput[orderId];
         if (!trackingNumber || trackingNumber.trim() === "") return;

         setIsUpdating((prev) => ({ ...prev, [orderId]: true }));

         // Update in Firestore
         const orderRef = doc(db, "Orders", orderId);
         await updateDoc(orderRef, { tracking_number: trackingNumber });

         // Update local state
         setOrders((prevOrders) => prevOrders.map((order) => (order.id === orderId ? { ...order, tracking_number: trackingNumber } : order)));

         // Clear input field
         setTrackingNumberInput((prev) => ({ ...prev, [orderId]: "" }));
         setIsUpdating((prev) => ({ ...prev, [orderId]: false }));
      } catch (error) {
         console.error("Error updating tracking number:", error);
         setIsUpdating((prev) => ({ ...prev, [orderId]: false }));
      }
   };

   // Handle sort toggle - memoized to prevent recreation on each render
   const toggleSort = useMemo(() => {
      return (field: string) => {
         if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
         } else {
            setSortField(field);
            setSortDirection("desc");
         }
      };
   }, [sortField, sortDirection]);

   // Show loading indicator on initial load
   if (initialLoad) {
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
               <h1 className="text-2xl font-semibold text-gray-900">{t("Admin.orders")}</h1>
               <p className="mt-1 text-sm text-gray-500">{t("Admin.manageOrders")}</p>
            </div>
         </div>

         {/* Filters Section */}
         <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
               <div className="w-full md:w-48">
                  <div className="relative">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Filter className="h-5 w-5 text-gray-400" />
                     </div>
                     <select value={selectedStatus || ""} onChange={(e) => setSelectedStatus(e.target.value || null)} className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm">
                        <option value="">{t("Admin.allStatuses")}</option>
                        {statuses.map((status, index) => (
                           <option key={status} value={status}>
                              {statusesRO[index]}
                           </option>
                        ))}
                     </select>
                  </div>
               </div>
            </div>
         </div>

         {/* Orders Table */}
         <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
               <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                     <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           <button className="flex items-center focus:outline-none uppercase" onClick={() => toggleSort("date")}>
                              {t("Admin.date")}
                              {sortField === "date" && (sortDirection === "asc" ? <ArrowUp className="w-4 h-4 ml-1" /> : <ArrowDown className="w-4 h-4 ml-1" />)}
                           </button>
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           {t("Admin.orderId")}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           {t("Admin.client")}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           {t("Admin.total")}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           {t("Admin.status")}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                           {t("Admin.awb")}
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                           {t("Admin.actions")}
                        </th>
                     </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                     {orders.length > 0 ? (
                        orders.map((order) => (
                           <tr key={order.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(order.date)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.id}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                 <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
                                 <div className="text-sm text-gray-500">{order.customerEmail}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.totalAmount.toFixed(2)} Lei</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                 <span
                                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                       order.status === "pending"
                                          ? "bg-yellow-100 text-yellow-800"
                                          : order.status === "accepted"
                                          ? "bg-blue-100 text-blue-800"
                                          : order.status === "shipped"
                                          ? "bg-purple-100 text-purple-800"
                                          : order.status === "delivered"
                                          ? "bg-green-100 text-green-800"
                                          : order.status === "rejected"
                                          ? "bg-red-100 text-red-800"
                                          : "bg-gray-100 text-gray-800"
                                    }`}
                                 >
                                    {order.status ? statusesRO[statuses.indexOf(order.status)] : t("Orders.unknown")}
                                 </span>
                                 {order.status === "pending" && (
                                    <div className="mt-2 flex space-x-1">
                                       <button onClick={() => updateOrderStatus(order.id, "accepted")} disabled={isUpdating[order.id]} className="text-xs bg-green-50 text-green-600 hover:bg-green-100 py-1 px-2 rounded-md flex items-center">
                                          <Check className="w-3 h-3 mr-1" />
                                          {t("Admin.accept")}
                                       </button>
                                       <button onClick={() => updateOrderStatus(order.id, "rejected")} disabled={isUpdating[order.id]} className="text-xs bg-red-50 text-red-600 hover:bg-red-100 py-1 px-2 rounded-md flex items-center">
                                          <X className="w-3 h-3 mr-1" />
                                          {t("Admin.reject")}
                                       </button>
                                    </div>
                                 )}
                                 {order.status === "accepted" && (
                                    <div className="mt-2">
                                       <button onClick={() => updateOrderStatus(order.id, "shipped")} disabled={isUpdating[order.id]} className="text-xs bg-purple-50 text-purple-600 hover:bg-purple-100 py-1 px-2 rounded-md flex items-center">
                                          <Truck className="w-3 h-3 mr-1" />
                                          {t("Admin.markAsShipped")}
                                       </button>
                                    </div>
                                 )}
                                 {order.status === "shipped" && (
                                    <div className="mt-2">
                                       <button onClick={() => updateOrderStatus(order.id, "delivered")} disabled={isUpdating[order.id]} className="text-xs bg-green-50 text-green-600 hover:bg-green-100 py-1 px-2 rounded-md flex items-center">
                                          <Package className="w-3 h-3 mr-1" />
                                          {t("Admin.markAsDelivered")}
                                       </button>
                                    </div>
                                 )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                 {order.status === "shipped" || order.status === "delivered" ? (
                                    order.tracking_number ? (
                                       <div className="text-sm text-gray-900">{order.tracking_number}</div>
                                    ) : (
                                       <div className="flex items-center space-x-2">
                                          <input type="text" value={trackingNumberInput[order.id] || ""} onChange={(e) => setTrackingNumberInput((prev) => ({ ...prev, [order.id]: e.target.value }))} placeholder={t("Admin.enterAwb")} className="text-sm border border-gray-300 rounded-md px-2 py-1 w-28" />
                                          <button onClick={() => updateTrackingNumber(order.id)} disabled={isUpdating[order.id] || !trackingNumberInput[order.id]} className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 py-1 px-2 rounded-md">
                                             {t("Admin.save")}
                                          </button>
                                       </div>
                                    )
                                 ) : (
                                    <span className="text-xs text-gray-500">N/A</span>
                                 )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                 <Link href={`/admin/orders/${order.id}`} className="text-indigo-600 hover:text-indigo-900">
                                    <Eye className="w-5 h-5 inline" />
                                 </Link>
                              </td>
                           </tr>
                        ))
                     ) : (
                        <tr>
                           <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                              {t("Admin.noOrders")}
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>

            {/* Load More Button */}
            {hasMore && !isLoading && (
               <div className="px-6 py-3 border-t border-gray-200 flex justify-center">
                  <button onClick={handleLoadMore} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                     {t("Admin.loadMore")}
                  </button>
               </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
               <div className="px-6 py-3 border-t border-gray-200 flex justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
               </div>
            )}
         </div>
      </div>
   );
}
