"use client";

import React, { useEffect, useState } from "react";
import { DollarSign, ShoppingBag, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { Order } from "@/types/user";
import { db } from "@/lib/firebaseInit";
import { collection, getDocs, query, orderBy, limit, where, Timestamp } from "firebase/firestore";
import { Product } from "@/types/product";
import { formatDistanceToNow } from "date-fns";
import { useTranslations } from "next-intl";

// Extended interfaces for transformed Firestore data
interface ExtendedOrder {
   id: string;
   customerName: string;
   date: string;
   total: number;
   status: Order["status"];
}

interface ExtendedProduct extends Partial<Product> {
   id: string;
   name: string;
   sold: number;
   revenue: number;
}

// Define a type for order products
interface OrderProduct {
   product_id: string;
   product_name: string;
   product_price: number;
   product_code?: string;
   product_image?: string;
   variant_id?: string;
   variant_name?: string;
   sku_variant_id?: string;
   sku_variant_name?: string;
   quantity: number;
   discount?: boolean;
   discount_price?: number;
   [key: string]: unknown; // For any other properties
}

// Card component for metrics - update for responsiveness
const MetricCard = ({ title, value, icon, description, change }: { title: string; value: string | number; icon: React.ReactNode; description?: string; change?: { value: number; positive: boolean } }) => (
   <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-100 h-full">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
         <h3 className="text-gray-500 text-xs sm:text-sm font-medium">{title}</h3>
         <div className="p-1.5 sm:p-2 bg-gray-50 rounded-full">{icon}</div>
      </div>
      <div className="flex flex-col">
         <p className="text-xl sm:text-2xl font-semibold">{value}</p>
         {description && <p className="text-gray-500 text-xs sm:text-sm mt-1">{description}</p>}
         {change && (
            <div className="flex flex-col sm:flex-row sm:items-center mt-2">
               <div className={`flex items-center ${change.positive ? "text-green-500" : "text-red-500"}`}>
                  <TrendingUp className={`w-3 h-3 sm:w-4 sm:h-4 mr-1 ${!change.positive && "transform rotate-180"}`} />
                  <span className="text-xs sm:text-sm font-medium">{change.value}%</span>
               </div>
               <span className="text-gray-500 text-xs ml-0 sm:ml-2 mt-1 sm:mt-0">vs luna trecută</span>
            </div>
         )}
      </div>
   </div>
);

// Add the timestamp helper function
const getTimestampSeconds = (timestamp: Timestamp | { _seconds: number; _nanoseconds: number }) => {
   return "seconds" in timestamp ? timestamp.seconds : timestamp._seconds;
};

// Status display helper
const getStatusDisplay = (status: string) => {
   const t = useTranslations();
   switch (status) {
      case "pending":
         return { text: t("Orders.pending"), class: "bg-yellow-100 text-yellow-800" };
      case "accepted":
         return { text: t("Orders.accepted"), class: "bg-green-100 text-green-800" };
      case "rejected":
         return { text: t("Orders.rejected"), class: "bg-red-100 text-red-800" };
      case "shipped":
         return { text: t("Orders.shipped"), class: "bg-blue-100 text-blue-800" };
      case "delivered":
         return { text: t("Orders.delivered"), class: "bg-green-100 text-green-800" };
      default:
         return { text: status || t("Orders.unknown"), class: "bg-gray-100 text-gray-800" };
   }
};

// Statistics table component - updated for responsiveness
const RecentOrdersTable = ({ orders }: { orders: ExtendedOrder[] }) => {
   const t = useTranslations();
   return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
         <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
         <h3 className="text-base sm:text-lg font-medium">{t("Admin.recentOrders")}</h3>
      </div>

      {/* Mobile order cards - only visible on small screens */}
      <div className="block sm:hidden divide-y divide-gray-200">
         {orders.length > 0 ? (
            orders.map((order) => {
               const statusDisplay = getStatusDisplay(order.status || "pending");
               return (
                  <div key={order.id} className="p-4">
                     <div className="flex justify-between items-start mb-2">
                        <Link href={`/admin/orders/${order.id}`} className="text-sm font-medium text-gray-900 hover:underline">
                           #{order.id.substring(0, 8)}...
                        </Link>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusDisplay.class}`}>{statusDisplay.text}</span>
                     </div>
                     <div className="grid grid-cols-2 gap-y-1 text-xs">
                        <div className="text-gray-500">{t("Admin.client")}:</div>
                        <div>{order.customerName}</div>
                        <div className="text-gray-500">{t("Admin.date")}:</div>
                        <div>{order.date}</div>
                        <div className="text-gray-500">{t("Admin.total")}:</div>
                        <div className="font-medium">{order.total} Lei</div>
                     </div>
                  </div>
               );
            })
         ) : (
            <div className="px-4 py-4 text-center text-sm text-gray-500">{t("Admin.noRecentOrders")}</div>
         )}
      </div>

      {/* Desktop table - hidden on small screens */}
      <div className="hidden sm:block">
         <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
               <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     {t("Admin.orderId")}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     {t("Admin.client")}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     {t("Admin.date")}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     {t("Admin.total")}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     {t("Admin.status")}
                  </th>
               </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
               {orders.length > 0 ? (
                  orders.map((order) => {
                     const statusDisplay = getStatusDisplay(order.status || "pending");
                     return (
                        <tr key={order.id} className="hover:bg-gray-50">
                           <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              <Link href={`/admin/orders/${order.id}`} className="hover:underline">
                                 {order.id.substring(0, 8)}...
                              </Link>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.customerName}</td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.date}</td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.total} Lei</td>
                           <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusDisplay.class}`}>{statusDisplay.text}</span>
                           </td>
                        </tr>
                     );
                  })
               ) : (
                  <tr>
                     <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                        {t("Admin.noRecentOrders")}
                     </td>
                  </tr>
               )}
            </tbody>
         </table>
      </div>

      <div className="px-4 sm:px-6 py-4 border-t border-gray-200">
         <Link href="/admin/orders" className="text-xs sm:text-sm font-medium text-pink-600 hover:text-pink-800">
            {t("Admin.viewAllOrders")} →
         </Link>
      </div>
      </div>
   );
};

// Top products table component - updated for responsiveness
const TopProductsTable = ({ products }: { products: ExtendedProduct[] }) => {
   const t = useTranslations();
   return (
   <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
         <h3 className="text-base sm:text-lg font-medium">{t("Admin.topProducts")}</h3>
      </div>

      {/* Mobile product cards - only visible on small screens */}
      <div className="block sm:hidden divide-y divide-gray-200">
         {products.length > 0 ? (
            products.map((product) => (
               <div key={product.id} className="p-4">
                  <Link href={`/admin/products/${product.id}`} className="text-sm font-medium text-gray-900 hover:underline block mb-2 truncate">
                     {product.name}
                  </Link>
                  <div className="grid grid-cols-2 gap-y-1 text-xs">
                     <div className="text-gray-500">{t("Admin.sales")}:</div>
                     <div>{product.sold}</div>
                     <div className="text-gray-500">{t("Admin.revenue")}:</div>
                     <div className="font-medium">{product.revenue} Lei</div>
                  </div>
               </div>
            ))
         ) : (
            <div className="px-4 py-4 text-center text-sm text-gray-500">{t("Admin.noProducts")}</div>
         )}
      </div>

      {/* Desktop table - hidden on small screens */}
      <div className="hidden sm:block">
         <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
               <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     {t("Admin.product")}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     {t("Admin.sales")}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     {t("Admin.revenue")}
                  </th>
               </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
               {products.length > 0 ? (
                  products.map((product) => (
                     <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                           <Link href={`/admin/products/${product.id}`} className="hover:underline">
                              <div className="truncate max-w-xs">{product.name}</div>
                           </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.sold}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.revenue} Lei</td>
                     </tr>
                  ))
               ) : (
                  <tr>
                     <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                        {t("Admin.noProducts")}
                     </td>
                  </tr>
               )}
            </tbody>
         </table>
      </div>

      <div className="px-4 sm:px-6 py-4 border-t border-gray-200">
         <Link href="/admin/products" className="text-xs sm:text-sm font-medium text-pink-600 hover:text-pink-800">
            {t("Admin.viewAllProducts")} →
         </Link>
      </div>
      </div>
   );
};

export default function AdminDashboard() {
   const [isLoading, setIsLoading] = useState(true);
   const [dashboardData, setDashboardData] = useState({
      totalOrders: 0,
      totalOrdersChange: 0,
      totalRevenue: 0,
      totalRevenueChange: 0,
      totalProducts: 0,
      totalCustomers: 0,
      totalCustomersChange: 0,
      pendingOrders: 0,
      pendingOrdersChange: 0,
      recentOrders: [] as ExtendedOrder[],
      topProducts: [] as ExtendedProduct[],
   });
   const t = useTranslations();
   useEffect(() => {
      // Function to fetch dashboard data
      const fetchDashboardData = async () => {
         try {
            setIsLoading(true);
            console.log("Fetching real data from Firestore...");
            const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
            const twoMonthsAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
            // Firestore collections references
            const ordersRef = query(collection(db, "Orders"), where("date", ">=", Timestamp.fromDate(new Date(oneMonthAgo))));
            const productsRef = collection(db, "Products");
            const usersRef = query(collection(db, "Users"), where("created_at", ">=", Timestamp.fromDate(new Date(oneMonthAgo))));
            const ordersRefTwoMonthsAgo = query(collection(db, "Orders"), where("date", ">=", Timestamp.fromDate(new Date(twoMonthsAgo))), where("date", "<=", Timestamp.fromDate(new Date(oneMonthAgo))));
            const usersRefTwoMonthsAgo = query(collection(db, "Users"), where("created_at", ">=", Timestamp.fromDate(new Date(twoMonthsAgo))), where("created_at", "<=", Timestamp.fromDate(new Date(oneMonthAgo))));

            // Get total counts
            const [ordersSnapshot, productsSnapshot, usersSnapshot] = await Promise.all([getDocs(ordersRef), getDocs(productsRef), getDocs(usersRef)]);
            const [ordersSnapshotTwoMonthsAgo, usersSnapshotTwoMonthsAgo] = await Promise.all([getDocs(ordersRefTwoMonthsAgo), getDocs(usersRefTwoMonthsAgo)]);

            const totalOrders = ordersSnapshot.size;
            const totalOrdersTwoMonthsAgo = ordersSnapshotTwoMonthsAgo.size;
            const totalOrdersChange = ((totalOrders - totalOrdersTwoMonthsAgo) / (totalOrdersTwoMonthsAgo ? totalOrdersTwoMonthsAgo : 1)) * 100 || 0;
            const totalProducts = productsSnapshot.size;
            const totalCustomers = usersSnapshot.size;
            const totalCustomersTwoMonthsAgo = usersSnapshotTwoMonthsAgo.size;
            const totalCustomersChange = ((totalCustomers - totalCustomersTwoMonthsAgo) / (totalCustomersTwoMonthsAgo ? totalCustomersTwoMonthsAgo : 1)) * 100 || 0;
            // Calculate pending orders
            const pendingOrdersQuery = query(ordersRef, where("status", "==", "pending"));
            const pendingOrdersSnapshot = await getDocs(pendingOrdersQuery);
            const pendingOrders = pendingOrdersSnapshot.size;

            // Calculate total revenue from all orders
            let totalRevenue = 0;
            ordersSnapshot.forEach((orderDoc) => {
               const orderData = orderDoc.data();
               // Add up product prices in the order
               totalRevenue += orderData.total - orderData.shipping_price;
            });
            let totalRevenueTwoMonthsAgo = 0;
            ordersSnapshotTwoMonthsAgo.forEach((orderDoc) => {
               const orderData = orderDoc.data();
               totalRevenueTwoMonthsAgo += orderData.total - orderData.shipping_price;
            });
            const totalRevenueChange = Number(((totalRevenue - totalRevenueTwoMonthsAgo) / (totalRevenueTwoMonthsAgo ? totalRevenueTwoMonthsAgo : 1)).toFixed(2)) * 100 || 0;

            // Get recent orders (last 5)
            const recentOrdersQuery = query(ordersRef, orderBy("date", "desc"), limit(5));
            const recentOrdersSnapshot = await getDocs(recentOrdersQuery);
            const recentOrdersPromises = recentOrdersSnapshot.docs.map(async (orderDoc) => {
               const orderData = orderDoc.data();
               // Get customer data
               let customerName = "Unknown Customer";
               if (orderData.first_name || orderData.last_name) {
                  // If user doc doesn't exist but order has name data
                  customerName = `${orderData.first_name || ""} ${orderData.last_name || ""}`.trim();
               } else if (orderData.email) {
                  customerName = orderData.email;
               }

               // Format date
               let formattedDate = "Unknown Date";
               if (orderData.date) {
                  try {
                     const dateTimestamp = getTimestampSeconds(orderData.date);
                     const date = new Date(dateTimestamp * 1000);
                     formattedDate = formatDistanceToNow(date, { addSuffix: true });
                  } catch (e) {
                     console.error("Error formatting date:", e);
                  }
               }

               return {
                  id: orderDoc.id,
                  customerName,
                  date: formattedDate,
                  total: orderData.total,
                  status: orderData.status || "pending",
               } as ExtendedOrder;
            });

            const recentOrders = await Promise.all(recentOrdersPromises);

            // Build product sales data
            const productSalesMap = new Map<string, { sold: number; revenue: number; name: string }>();

            // Count product sales from orders
            ordersSnapshot.forEach((orderDoc) => {
               const orderData = orderDoc.data();
               if (orderData.products && Array.isArray(orderData.products)) {
                  orderData.products.forEach((product: OrderProduct) => {
                     if (product.product_id) {
                        const productId = product.product_id;
                        const price = product.discount && product.discount_price ? Number(product.discount_price) : Number(product.product_price);
                        const currentStats = productSalesMap.get(productId) || {
                           sold: 0,
                           revenue: 0,
                           name: product.product_name || "Unknown Product",
                        };
                        const soldCount = product.quantity || 0;
                        const revenue = !isNaN(price) ? price * soldCount : 0;

                        productSalesMap.set(productId, {
                           sold: currentStats.sold + soldCount,
                           revenue: currentStats.revenue + revenue,
                           name: product.product_name || currentStats.name,
                        });
                     }
                  });
               }
            });

            // Convert to array and sort by revenue
            const topProducts: ExtendedProduct[] = [...productSalesMap.entries()]
               .map(([id, stats]) => ({
                  id,
                  name: stats.name,
                  sold: stats.sold,
                  revenue: Math.round(stats.revenue * 100) / 100,
               }))
               .sort((a, b) => b.revenue - a.revenue)
               .slice(0, 5);

            setDashboardData({
               totalOrders,
               totalOrdersChange: totalOrdersChange,
               totalRevenue: Math.round(totalRevenue * 100) / 100,
               totalRevenueChange: totalRevenueChange,
               totalProducts,
               totalCustomers,
               totalCustomersChange: totalCustomersChange,
               pendingOrders,
               pendingOrdersChange: 0,
               recentOrders,
               topProducts,
            });

            setIsLoading(false);
         } catch (error) {
            console.error("Error fetching dashboard data:", error);
            setIsLoading(false);
         }
      };

      fetchDashboardData();
   }, []);

   if (isLoading) {
      return (
         <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
         </div>
      );
   }

   return (
      <div className="space-y-6">
         <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">{t("Admin.mainPanel")}</h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">{t("Admin.overview")}</p>
         </div>

         {/* Metrics */}
         <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <MetricCard title="Total Comenzi" value={dashboardData.totalOrders} icon={<ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500" />} change={{ value: dashboardData.totalOrdersChange, positive: Math.sign(dashboardData.totalOrdersChange) === 1 }} />
            <MetricCard title="Venit Total" value={`${dashboardData.totalRevenue} Lei`} icon={<DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />} change={{ value: dashboardData.totalRevenueChange, positive: Math.sign(dashboardData.totalRevenueChange) === 1 }} />
            <MetricCard title="Produse" value={dashboardData.totalProducts} icon={<ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />} description={`${dashboardData.pendingOrders} comenzi în așteptare`} />
            <MetricCard title="Clienți noi" value={dashboardData.totalCustomers} icon={<Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />} change={{ value: dashboardData.totalCustomersChange, positive: Math.sign(dashboardData.totalCustomersChange) === 1 }} />
         </div>

         {/* Orders Alert */}
         {dashboardData.pendingOrders > 0 && (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
               <div className="flex">
                  <div className="flex-shrink-0">
                     <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                     </svg>
                  </div>
                  <div className="ml-3">
                     <h3 className="text-sm font-medium text-yellow-800">{t("Admin.neededAttention")}</h3>
                     <div className="mt-1 text-sm text-yellow-700">
                        <p>{t("Admin.nOrdersInPending", { n: dashboardData.pendingOrders })}</p>
                     </div>
                     <div className="mt-2">
                        <Link href="/admin/orders?status=pending" className="text-sm font-medium text-yellow-800 hover:text-yellow-700 underline">
                           {t("Admin.viewPendingOrders")} →
                        </Link>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* Tables */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentOrdersTable orders={dashboardData.recentOrders} />
            <TopProductsTable products={dashboardData.topProducts} />
         </div>
      </div>
   );
}
