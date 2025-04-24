"use client";

import { useAuthContext } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Order, Address } from "@/types/user";
import { ArrowLeft } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseInit";
import { Timestamp } from "firebase/firestore";
import { CartProduct } from "@/types/product";
import { useTranslations } from "next-intl";
interface OrderDetailsProps {
   params: Promise<{ id: string }> | { id: string };
}

export default function OrderDetailsPage({ params }: OrderDetailsProps) {
   const { user } = useAuthContext();
   const t = useTranslations("Orders");
   const paramValues = use(params as unknown as Promise<{ id: string }>) as { id: string };
   const id = paramValues.id;
   const router = useRouter();
   const [order, setOrder] = useState<Order | null>(null);
   const [loading, setLoading] = useState(true);
   const [shippingAddress, setShippingAddress] = useState<Address | null>(null);
   const [billingAddress, setBillingAddress] = useState<Address | null>(null);

   useEffect(() => {
      const fetchOrder = async () => {
         if (!user) {
            setLoading(false);
            return;
         }
         try {
            // If not found in the array, fetch directly from the Orders collection
            const orderDoc = await getDoc(doc(db, "Orders", id));

            if (orderDoc.exists()) {
               const orderData = orderDoc.data() as Omit<Order, "id">;

               // Verify that this order belongs to the current user
               if (orderData.user_id === user.uid) {
                  const completeOrder = {
                     id: orderDoc.id,
                     ...orderData,
                  };

                  setOrder(completeOrder);

                  // Set addresses from the stored objects if available
                  if (orderData.shipping_address) {
                     setShippingAddress(orderData.shipping_address);
                  }
                  if (orderData.billing_address) {
                     setBillingAddress(orderData.billing_address);
                  }
               } else {
                  // Order doesn't belong to this user, redirect to profile
                  router.push("/profile");
               }
            } else {
               // Order not found, redirect to profile
               router.push("/profile");
            }
         } catch (error) {
            console.error("Error fetching order:", error);
            // Order not found or error, redirect to profile
            router.push("/profile");
         }

         setLoading(false);
      };

      fetchOrder();
   }, [user, id, router]);

   // Fetch addresses by ID if not included in the order object (for backward compatibility)
   useEffect(() => {
      const fetchAddresses = async () => {
         if (!user || !order) return;

         // Skip if we already have the addresses from the order object
         if (shippingAddress && billingAddress) return;

         // First try to find addresses in the user.db.addresses array (for backward compatibility)
         if (user.db?.addresses) {
            if (!shippingAddress && order.shipping_address_id) {
               const shipping = user.db.addresses.find((addr) => addr.id === order.shipping_address_id);
               if (shipping) setShippingAddress(shipping);
            }

            if (!billingAddress && order.billing_address_id) {
               const billing = user.db.addresses.find((addr) => addr.id === order.billing_address_id);
               if (billing) setBillingAddress(billing);
            }

            // If both addresses are found, no need to fetch from subcollection
            if (shippingAddress && billingAddress) return;
         }

         // If addresses not found in the array, fetch directly from the Addresses subcollection
         try {
            if (!shippingAddress && order.shipping_address_id) {
               const shippingDoc = await getDoc(doc(db, "Users", user.uid, "Addresses", order.shipping_address_id));
               if (shippingDoc.exists()) {
                  setShippingAddress({
                     id: shippingDoc.id,
                     ...(shippingDoc.data() as Omit<Address, "id">),
                  });
               }
            }

            if (!billingAddress && order.billing_address_id) {
               const billingDoc = await getDoc(doc(db, "Users", user.uid, "Addresses", order.billing_address_id));
               if (billingDoc.exists()) {
                  setBillingAddress({
                     id: billingDoc.id,
                     ...(billingDoc.data() as Omit<Address, "id">),
                  });
               }
            }
         } catch (error) {
            console.error("Error fetching addresses:", error);
         }
      };

      fetchAddresses();
   }, [user, order, shippingAddress, billingAddress]);

   if (loading) {
      return (
         <div className="py-8 px-4 md:px-8 lg:px-16 xl:px-32 2xl:px-64">
            <div className="h-96 flex items-center justify-center">
               <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
            </div>
         </div>
      );
   }

   if (!order) {
      return (
         <div className="py-8 px-4 md:px-8 lg:px-16 xl:px-32 2xl:px-64">
            <div className="text-center py-12">
               <h2 className="text-2xl font-medium mb-4">{t("orderNotFound")}</h2>
               <p className="text-gray-600 mb-6">{t("orderNotFoundDescription")}</p>
               <Link href="/profile" className="bg-black text-white px-6 py-2 rounded-md hover:bg-opacity-90 transition-colors">
                  {t("backToProfile")}
               </Link>
            </div>
         </div>
      );
   }

   // Calculate order totals
   const subtotal = order.products.reduce((sum, product) => {
      const price = product.discount && product.discount_price ? product.discount_price : product.product_price;
      return sum + price * product.quantity;
   }, 0);

   const total = subtotal + order.shipping_price;

   // Format date
   const getTimestampSeconds = (timestamp: Timestamp | { _seconds: number; _nanoseconds: number }) => {
      return "seconds" in timestamp ? timestamp.seconds : timestamp._seconds;
   };
   const date = order.date ? new Date(getTimestampSeconds(order.date) * 1000) : new Date();
   const formattedDate = date.toLocaleDateString("ro-RO");

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
      <div className="py-8 px-4 md:px-8 lg:px-16 xl:px-32 2xl:px-64">
         <div className="mb-6">
            <Link href="/profile" className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors">
               <ArrowLeft size={18} />
               <span>{t("backToProfile")}</span>
            </Link>
         </div>

         <h1 className="text-xl sm:text-2xl font-medium mb-6 sm:mb-8">{t("orderDetails")} #{order.id}</h1>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-100">
               <h2 className="text-lg font-medium mb-4">{t("orderInformations")}</h2>
               <div className="space-y-2">
                  <div className="flex justify-between">
                     <p className="text-gray-600">{t("orderId")}:</p>
                     <p className="font-medium text-sm sm:text-base truncate max-w-[150px] sm:max-w-none">{order.id}</p>
                  </div>
                  <div className="flex justify-between">
                     <p className="text-gray-600">{t("date")}:</p>
                     <p>{formattedDate}</p>
                  </div>
                  {order.status && (
                     <div className="flex justify-between">
                        <p className="text-gray-600">{t("status")}:</p>
                        <p className={`${order.status === "delivered" ? "text-green-600" : order.status === "rejected" ? "text-red-600" : ""} font-medium`}>
                           {order.status === "pending" && t("waiting")}
                           {order.status === "accepted" && t("accepted")}
                           {order.status === "rejected" && t("rejected")}
                           {order.status === "shipped" && t("shipped")}
                           {order.status === "delivered" && t("delivered")}
                           {order.status && !["pending", "accepted", "rejected", "shipped", "delivered"].includes(order.status) && order.status}
                        </p>
                     </div>
                  )}
                  {order.tracking_number && (
                     <div className="flex justify-between">
                        <p className="text-gray-600">{t("trackingNumber")}:</p>
                        <p className="font-medium text-sm sm:text-base truncate max-w-[150px] sm:max-w-none">{order.tracking_number}</p>
                     </div>
                  )}
                  {order.voucher && order.voucher_id && (
                     <div className="flex justify-between">
                        <p className="text-gray-600">{t("voucher")}:</p>
                        <p className="truncate max-w-[150px] sm:max-w-none">{order.voucher_id}</p>
                     </div>
                  )}
               </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-100">
               <h2 className="text-lg font-medium mb-4">{t("shippingAddress")}</h2>
               {shippingAddress ? (
                  <div>
                     <p className="font-medium text-sm sm:text-base">
                        {shippingAddress.street} {shippingAddress.street_no}
                        {shippingAddress.building && `, ${t("buildingShort")} ${shippingAddress.building}`}
                        {shippingAddress.building_no && `, ${t("buildingNoShort")} ${shippingAddress.building_no}`}
                        {shippingAddress.apartment && `, ${t("apartmentShort")} ${shippingAddress.apartment}`}
                        {shippingAddress.floor ? `, ${t("floorShort")} ${shippingAddress.floor}` : ""}
                     </p>
                     <p className="text-gray-600 text-sm sm:text-base">
                        {shippingAddress.city}, {shippingAddress.county}, {shippingAddress.postal_code}
                     </p>
                     {shippingAddress.details && <p className="text-gray-500 text-xs sm:text-sm mt-1">{shippingAddress.details}</p>}
                  </div>
               ) : (
                  <p className="text-gray-500">{t("addressNotFound")}</p>
               )}
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-100">
               <h2 className="text-lg font-medium mb-4">{t("billingAddress")}</h2>
               {billingAddress ? (
                  <div>
                     <p className="font-medium text-sm sm:text-base">
                        {billingAddress.street} {billingAddress.street_no}
                        {billingAddress.building && `, ${t("buildingShort")} ${billingAddress.building}`}
                        {billingAddress.building_no && `, ${t("buildingNoShort")} ${billingAddress.building_no}`}
                        {billingAddress.apartment && `, ${t("apartmentShort")} ${billingAddress.apartment}`}
                        {billingAddress.floor ? `, ${t("floorShort")} ${billingAddress.floor}` : ""}
                     </p>
                     <p className="text-gray-600 text-sm sm:text-base">
                        {billingAddress.city}, {billingAddress.county}, {billingAddress.postal_code}
                     </p>
                     {billingAddress.details && <p className="text-gray-500 text-xs sm:text-sm mt-1">{billingAddress.details}</p>}
                  </div>
               ) : (
                  <p className="text-gray-500">{t("addressNotFound")}</p>
               )}
            </div>
         </div>

         <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-6">
            <h2 className="text-lg font-medium p-4 sm:p-6 border-b border-gray-100">{t("orderedProducts")}</h2>

            <div className="divide-y divide-gray-100 p-4 sm:p-6 flex flex-col gap-4">
               {Object.entries(groupedCart).map(([productId, group]) => (
                  <div key={productId} className="border border-gray-100 rounded-lg shadow-sm overflow-hidden">
                     {/* Product Header */}
                     <div className="p-3 bg-gray-50 border-b border-gray-100">
                        <Link href={`/product/${group.product_name}?id=${productId}`} className="flex gap-3 items-center">
                           <Image src={group.product_image} alt={group.product_name} width={80} height={80} className="object-contain rounded-md max-h-[80px] max-w-[80px] bg-white" />
                           <h2 className="font-medium text-sm hover:text-pink-700">{group.product_name}</h2>
                        </Link>
                     </div>

                     {/* Variants */}
                     <div className="divide-y divide-gray-50">
                        {group.variants.map((item) => {
                           const price = {
                              price: item.product_price?.toFixed(2).split(".").map(Number) || [0, 0],
                              discount: item.discount_price?.toFixed(2)?.split(".")?.map(Number),
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
                                    <span className="text-xs text-gray-400">Cantitate: {item.quantity}</span>
                                 </div>

                                 <div className="flex items-center gap-4">
                                    <div className="text-right">
                                       <div className="relative">
                                          {price.discount ? (
                                             <div className="flex flex-col relative">
                                                <h3 className="text-xs text-gray-500 line-through absolute -top-3 right-0">{(Number(price.price.join(".")) * item.quantity).toFixed(2)} Lei</h3>
                                                <h2 className="font-medium text-base text-pink-700">{(Number(price.discount.join(".")) * item.quantity).toFixed(2)} Lei</h2>
                                             </div>
                                          ) : (
                                             <h2 className="font-medium text-base text-pink-700">{(Number(price.price.join(".")) * item.quantity).toFixed(2)} Lei</h2>
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

            <div className="border-t border-gray-100 p-4 sm:p-6">
               <div className="flex justify-between mb-2">
                  <p className="text-gray-600">{t("subtotal")}:</p>
                  <p>{subtotal.toFixed(2)} Lei</p>
               </div>
               <div className="flex justify-between mb-2">
                  <p className="text-gray-600">{t("shippingCost")}:</p>
                  <p>{order.shipping_price.toFixed(2)} Lei</p>
               </div>
               {order.voucher && (
                  <div className="flex justify-between mb-2 text-green-600">
                     <p>{t("discount")} {t("voucher")}:</p>
                     <p>-0.00 Lei</p>
                  </div>
               )}
               <div className="flex justify-between font-medium text-lg mt-4 pt-4 border-t border-gray-100">
                  <p>{t("total")}:</p>
                  <p>{total.toFixed(2)} Lei</p>
               </div>
            </div>
         </div>
      </div>
   );
}
