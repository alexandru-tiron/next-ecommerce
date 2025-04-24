"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthContext } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebaseInit";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Order } from "@/types/user";
import { useTranslations } from "next-intl";

const OrdersSection = () => {
   const t = useTranslations("Orders");
   const router = useRouter();
   const { user } = useAuthContext();
   const [orders, setOrders] = useState<Order[]>([]);

   useEffect(() => {
      if (user) {
         const fetchOrders = async () => {
            const orders = await getDocs(query(collection(db, "Orders"), where("user_id", "==", user.uid)));
            const ordersData = orders.docs.map((doc) => ({
               id: doc.id,
               ...doc.data(),
            }));
            setOrders(ordersData as Order[]);
         };
         fetchOrders();
      }
   }, [user]);

   const handleOrderClick = (orderId: string) => {
      router.push(`/profile/orders/${orderId}`);
   };

   // If user is null, show a loading state
   if (!user) {
      return (
         <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-100">
            <div className="text-center py-8 text-gray-500">
               <p>{t("loadingOrders")}</p>
            </div>
         </div>
      );
   }

   return (
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-100">
         <h2 className="text-xl font-medium mb-6">{t("myOrders")}</h2>

         {orders.length > 0 ? (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
               <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full divide-y divide-gray-200">
                     <thead className="bg-gray-50">
                        <tr>
                           <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t("orderId")}
                           </th>
                           <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t("date")}
                           </th>
                           <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t("total")}
                           </th>
                           <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t("nrProducts")}
                           </th>
                           <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t("details")}
                           </th>
                        </tr>
                     </thead>
                     <tbody className="bg-white divide-y divide-gray-200">
                        {orders.map((order) => {
                           // Calculate order total
                           const total =
                              order.products.reduce((sum, product) => {
                                 const price = product.discount && product.discount_price ? product.discount_price : product.product_price;
                                 return sum + price * product.quantity;
                              }, 0) + order.shipping_price;

                           // Format date
                           const formattedDate = order.date
                              ? new Date("toDate" in order.date ? order.date.toDate() : order.date._seconds * 1000).toLocaleDateString("ro-RO", {
                                   day: "2-digit",
                                   month: "2-digit",
                                   year: "numeric",
                                })
                              : new Date().toLocaleDateString("ro-RO", {
                                   day: "2-digit",
                                   month: "2-digit",
                                   year: "numeric",
                                });

                           return (
                              <tr key={order.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleOrderClick(order.id)}>
                                 <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium truncate max-w-[80px] sm:max-w-none">{order.id}</td>
                                 <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">{formattedDate}</td>
                                 <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">{total.toFixed(2)} Lei</td>
                                 <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">{order.products.length}</td>
                                 <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                                    <button className="text-pink-600 hover:text-pink-900">{t("viewDetails")}</button>
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>
            </div>
         ) : (
            <div className="text-center py-8 text-gray-500">
               <p>{t("noOrders")}</p>
               <Link href="/list" className="mt-4 inline-block px-6 py-2 bg-black text-white rounded-md hover:bg-opacity-90 transition-colors">
                  {t("startShopping")}
               </Link>
            </div>
         )}
      </div>
   );
};

export default OrdersSection;
