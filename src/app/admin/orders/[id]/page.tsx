"use client";

import React, { useState, useEffect, use } from "react";
import { db } from "@/lib/firebaseInit";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ArrowLeft, MapPin, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Order, Address } from "@/types/user";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Timestamp } from "firebase/firestore";
import { CartProduct } from "@/types/product";
import { Money } from "@/components/common/Price";
import { useFormatDate } from "@/components/common/useFormatDate";
import { useTranslations } from "next-intl";

// Updated interface to fix Next.js 15 type error
interface OrderDetailPageProps {
   params: Promise<{ id: string }>;
}

// Add the timestamp helper function
const getTimestampSeconds = (timestamp: Timestamp | { _seconds: number; _nanoseconds: number }) => {
   return "seconds" in timestamp ? timestamp.seconds : timestamp._seconds;
};

const ORDER_STATUSES = ["pending", "accepted", "rejected", "shipped", "delivered"] as const;

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
   const router = useRouter();
   const t = useTranslations("AdminOrder");
   const tOrders = useTranslations("Orders");
   const tPayment = useTranslations("Payment");
   const formatStoreDate = useFormatDate();
   const paramValues = use(params);
   const id = paramValues.id;
   const [order, setOrder] = useState<Order | null>(null);
   const [loading, setLoading] = useState(true);
   const [updating, setUpdating] = useState(false);
   const [trackingNumber, setTrackingNumber] = useState("");
   const [status, setStatus] = useState<string>("");
   // const [statusUpdateMessage, setStatusUpdateMessage] = useState<{ type: "success" | "error"; message: string } | null>(null);

   useEffect(() => {
      const fetchOrderData = async () => {
         try {
            setLoading(true);
            const orderDoc = await getDoc(doc(db, "Orders", id));

            if (!orderDoc.exists()) {
               console.error("Order not found");
               router.push("/admin/orders");
               return;
            }

            const orderData = orderDoc.data() as Omit<Order, "id">;
            const fullOrder = {
               id: orderDoc.id,
               ...orderData,
            } as Order;

            setOrder(fullOrder);
            setTrackingNumber(fullOrder.tracking_number || "");
            setStatus(fullOrder.status || "pending");
         } catch (error) {
            console.error("Error fetching order:", error);
         } finally {
            setLoading(false);
         }
      };

      fetchOrderData();
   }, [id, router]);

   const updateOrder = async () => {
      if (!order) return;

      try {
         setUpdating(true);
         await updateDoc(doc(db, "Orders", order.id), {
            status: status,
            tracking_number: trackingNumber,
         });

         // Update the local state
         setOrder({
            ...order,
            status: status as "pending" | "accepted" | "rejected" | "shipped" | "delivered",
            tracking_number: trackingNumber,
         });

         //    setStatusUpdateMessage({
         //       type: "success",
         //       message: "Order updated successfully",
         //    });

         //    // Clear message after 3 seconds
         //    setTimeout(() => {
         //       setStatusUpdateMessage(null);
         //    }, 3000);
         // } catch (error) {
         //    console.error("Error updating order:", error);
         //    setStatusUpdateMessage({
         //       type: "error",
         //       message: "Failed to update order",
         //    });
      } finally {
         setUpdating(false);
      }
   };

   const formatDate = (timestamp: Timestamp | { _seconds: number; _nanoseconds: number } | undefined) => {
      if (!timestamp) return tOrders("unknown");
      try {
         const seconds = getTimestampSeconds(timestamp);
         const date = new Date(seconds * 1000);
         return formatStoreDate(date, {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
         });
      } catch (error) {
         console.error("Error formatting date:", error);
         return tOrders("unknown");
      }
   };

   // Return function to conditionally display order status text with proper case
   const formatStatus = (status: string | undefined) => (status && (ORDER_STATUSES as readonly string[]).includes(status) ? tOrders(status as (typeof ORDER_STATUSES)[number]) : tOrders("unknown"));

   // Shipping Address Display Component
   const ShippingAddressDisplay = ({ address }: { address: Address }) => (
      <div className="text-sm text-gray-600">
         <p>{`${order?.first_name || ""} ${order?.last_name || ""}`}</p>
         <p>
            {address.street} {address.street_no}
         </p>
         {address.apartment && (
            <p>
               {address.building && `${tOrders("buildingShort")} ${address.building}, `}
               {address.floor !== undefined && `${tOrders("floorShort")} ${address.floor}, `}
               {tOrders("apartmentShort")} {address.apartment}
            </p>
         )}
         <p>
            {address.city}, {address.county}
         </p>
         <p>{address.postal_code}</p>
         {address.details && <p className="mt-2 text-gray-500 italic">{address.details}</p>}
      </div>
   );

   // Billing Address Display Component for reuse
   const BillingAddressDisplay = ({ address }: { address: Address }) => (
      <div className="text-sm text-gray-600">
         <p>{`${order?.first_name || ""} ${order?.last_name || ""}`}</p>
         {address.business && address.business_details && <p className="font-medium">{address.business_details.name}</p>}
         <p>
            {address.street} {address.street_no}
         </p>
         {address.apartment && (
            <p>
               {address.building && `${tOrders("buildingShort")} ${address.building}, `}
               {address.floor !== undefined && `${tOrders("floorShort")} ${address.floor}, `}
               {tOrders("apartmentShort")} {address.apartment}
            </p>
         )}
         <p>
            {address.city}, {address.county}
         </p>
         <p>{address.postal_code}</p>
         {address.business && address.business_details && (
            <>
               <p className="mt-1">{t("taxId")}: {address.business_details.cui}</p>
               <p>{t("regNo")}: {address.business_details.reg_no}</p>
               {address.business_details.bank && <p>{t("bank")}: {address.business_details.bank}</p>}
               {address.business_details.iban && <p>IBAN: {address.business_details.iban}</p>}
            </>
         )}
         {address.details && <p className="mt-2 text-gray-500 italic">{address.details}</p>}
      </div>
   );

   if (loading) {
      return (
         <div className="p-6">
            <div className="flex justify-center">
               <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
            </div>
         </div>
      );
   }

   if (!order) {
      return (
         <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">{t("notFound")}</h1>
            <Link href="/admin/orders" className="text-indigo-600 hover:text-indigo-900">
               {t("back")}
            </Link>
         </div>
      );
   }

   const groupedCart = order.products.reduce((acc, item) => {
      if (!acc[item.product_id]) {
         acc[item.product_id] = {
            product_name: item.product_name,
            product_image: item.product_image,
            variants: [],
         };
      }
      acc[item.product_id].variants.push(item);
      return acc;
   }, {} as Record<string, { product_name: string; product_image: string; variants: CartProduct[] }>);

   return (
      <div className="p-4 md:p-6">
         <div className="flex items-center mb-6">
            <Link href="/admin/orders" className="text-gray-500 hover:text-gray-700 mr-4">
               <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold">{t("title", { id: order.id })}</h1>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Order Info */}
            <div className="bg-white rounded-lg shadow p-6 col-span-1">
               <h2 className="text-lg font-medium mb-4">{t("orderInfo")}</h2>
               <div className="space-y-3">
                  <div className="flex justify-between">
                     <span className="text-gray-500">{t("orderId")}:</span>
                     <span className="font-medium">{order.id}</span>
                  </div>
                  <div className="flex justify-between">
                     <span className="text-gray-500">{tOrders("date")}:</span>
                     <span>{formatDate(order.date)}</span>
                  </div>
                  <div className="flex justify-between">
                     <span className="text-gray-500">{tOrders("status")}:</span>
                     <span className={`font-medium ${order.status === "delivered" ? "text-green-600" : order.status === "shipped" ? "text-blue-600" : order.status === "accepted" ? "text-yellow-600" : order.status === "rejected" ? "text-red-600" : "text-gray-600"}`}>
                        {formatStatus(order.status)}
                     </span>
                  </div>
                  <div className="flex justify-between">
                     <span className="text-gray-500">{t("payment")}:</span>
                     <span className={`font-medium ${order.payment_status === "paid" ? "text-green-600" : order.payment_status === "failed" || order.payment_status === "expired" ? "text-red-600" : order.payment_status === "pending" ? "text-yellow-600" : "text-gray-600"}`}>
                        {tPayment(`method_${order.payment_method ?? "cod"}`)} · {tPayment(`status_${order.payment_status ?? "on_delivery"}`)}
                     </span>
                  </div>
                  {order.tracking_number && (
                     <div className="flex justify-between">
                        <span className="text-gray-500">{tOrders("trackingNumber")}:</span>
                        <span className="font-medium">{order.tracking_number}</span>
                     </div>
                  )}
                  <div className="flex justify-between">
                     <span className="text-gray-500">{tOrders("subtotal")}:</span>
                     <span className="font-medium"><Money amount={(order.total - order.shipping_price + (order.voucher_discount ?? 0))} /></span>
                  </div>
                  <div className="flex justify-between">
                     <span className="text-gray-500">{tOrders("shippingCost")}:</span>
                     <span className="font-medium"><Money amount={order.shipping_price} /></span>
                  </div>
                  {order.voucher && order.voucher_id && (
                     <div className="flex justify-between text-green-700">
                        <span>{t("voucher", { code: order.voucher_id })}:</span>
                        <span className="font-medium">-<Money amount={(order.voucher_discount ?? 0)} /></span>
                     </div>
                  )}
                  <div className="flex justify-between">
                     <span className="text-gray-500">{tOrders("total")}:</span>
                     <span className="font-medium"><Money amount={order.total} /></span>
                  </div>
                  {order.vat_rate !== undefined && order.vat_amount !== undefined && (
                     <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t("vatIncluded", { rate: order.vat_rate })}:</span>
                        <span><Money amount={order.vat_amount} /></span>
                     </div>
                  )}
               </div>
            </div>

            {/* Customer Info */}
            <div className="bg-white rounded-lg shadow p-6 col-span-1">
               <h2 className="text-lg font-medium mb-4">{t("customerInfo")}</h2>
               {order.user_id ? (
                  <div className="space-y-3">
                     <div className="flex justify-between">
                        <span className="text-gray-500">{t("name")}:</span>
                        <span>
                           {order.first_name} {order.last_name}
                        </span>
                     </div>
                     <div className="flex justify-between">
                        <span className="text-gray-500">{t("email")}:</span>
                        <span className="break-all">
                           <a href={`mailto:${order.email}`} className="text-indigo-600 hover:text-indigo-900">
                              {order.email}
                           </a>
                        </span>
                     </div>
                     {order.phone_no && (
                        <div className="flex justify-between">
                           <span className="text-gray-500">{t("phone")}:</span>
                           <span>{order.phone_no}</span>
                        </div>
                     )}
                     <div className="pt-2">
                        <Link href={`/admin/customers/${order.user_id}`} className="text-indigo-600 hover:text-indigo-900 text-sm">
                           {t("viewCustomer")}
                        </Link>
                     </div>
                  </div>
               ) : (
                  <p className="text-gray-500">{t("noCustomer")}</p>
               )}
            </div>

            {/* Order Management */}
            <div className="bg-white rounded-lg shadow p-6 col-span-1">
               <h2 className="text-lg font-medium mb-4">{t("manage")}</h2>
               <div className="space-y-4">
                  <div>
                     <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                        {tOrders("status")}
                     </label>
                     <select id="status" value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                        {ORDER_STATUSES.map((value) => (
                           <option key={value} value={value}>
                              {tOrders(value)}
                           </option>
                        ))}
                     </select>
                  </div>
                  <div>
                     <label htmlFor="tracking" className="block text-sm font-medium text-gray-700 mb-1">
                        {tOrders("trackingNumber")}
                     </label>
                     <input
                        type="text"
                        id="tracking"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        className="mt-1 px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        placeholder={t("trackingPlaceholder")}
                     />
                  </div>
                  <div className="pt-2">
                     <button
                        onClick={updateOrder}
                        disabled={updating}
                        className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                     >
                        {updating ? t("updating") : t("update")}
                        {!updating && <CheckCircle className="ml-2 h-4 w-4" />}
                     </button>
                  </div>
               </div>
            </div>
         </div>

         {/* Addresses */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Shipping Address */}
            <div className="bg-white rounded-lg shadow p-6">
               <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-gray-500" />
                  {tOrders("shippingAddress")}
               </h2>
               {order?.shipping_address ? <ShippingAddressDisplay address={order.shipping_address} /> : <p className="text-sm text-gray-500">{tOrders("addressNotFound")}</p>}
            </div>

            {/* Billing Address */}
            <div className="bg-white rounded-lg shadow p-6">
               <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-gray-500" />
                  {tOrders("billingAddress")}
               </h2>
               {order?.billing_address ? <BillingAddressDisplay address={order.billing_address} /> : <p className="text-sm text-gray-500">{tOrders("addressNotFound")}</p>}
            </div>
         </div>

         {/* Order Items */}
         <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
               <h2 className="text-lg font-medium">{tOrders("orderedProducts")}</h2>
            </div>
            <div className="divide-y divide-gray-200 p-4 sm:p-6 flex flex-col gap-4">
               {Object.entries(groupedCart).map(([productId, group]) => (
                  <div key={productId} className="border border-gray-100 rounded-lg shadow-sm overflow-hidden">
                     {/* Product Header */}
                     <div className="p-3 bg-gray-50 border-b border-gray-100">
                        <Link href={`/admin/products/${group.product_name}?id=${productId}`} className="flex gap-3 items-center">
                           <Image src={group.product_image} alt={group.product_name} width={80} height={80} className="object-contain rounded-md max-h-[80px] max-w-[80px] bg-white" />
                           <h2 className="font-medium text-sm hover:text-brand-700">{group.product_name}</h2>
                        </Link>
                     </div>

                     {/* Variants */}
                     <div className="divide-y divide-gray-50">
                        {group.variants.map((item) => {
                           const price = {
                              price: item.product_price?.toFixed(2).split(".") || ["0", "00"],
                              discount: item.discount_price?.toFixed(2)?.split("."),
                           };

                           return (
                              <div key={item.id} className="py-2 px-3 flex justify-between items-center">
                                 <div className="flex flex-col gap-0.5">
                                    <div className="flex gap-2 text-sm">
                                       {item.variant_name && <span className="text-gray-500">{item.variant_name}</span>}
                                       {item.sku_variant_name && (
                                          <>
                                             {item.variant_name && <span className="text-gray-300">|</span>}
                                             <span className="text-gray-500">{item.sku_variant_name}</span>
                                          </>
                                       )}
                                    </div>
                                    <span className="text-xs text-gray-400">{t("quantity", { quantity: item.quantity })}</span>
                                 </div>

                                 <div className="flex items-center gap-4">
                                    <div className="text-right">
                                       <div className="relative">
                                          {price.discount ? (
                                             <div className="flex flex-col relative">
                                                <h3 className="text-xs text-gray-500 line-through absolute -top-3 right-0"><Money amount={(Number(price.price.join(".")) * item.quantity)} /></h3>
                                                <h2 className="font-medium text-base text-brand-700"><Money amount={(Number(price.discount.join(".")) * item.quantity)} /></h2>
                                             </div>
                                          ) : (
                                             <h2 className="font-medium text-base text-brand-700"><Money amount={(Number(price.price.join(".")) * item.quantity)} /></h2>
                                          )}
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </div>
   );
}
