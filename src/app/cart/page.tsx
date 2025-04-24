"use client";
import { useCartContext } from "@/context/CartContext";
import Image from "next/image";
import Link from "next/link";
import { CartProduct } from "@/types/product";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

export default async function CartPage() {
   const t = useTranslations();
   const { cart, subTotal, isLoading, removeItem } = useCartContext();
   console.log(cart);
   if (cart.length === 0) {
      return (
         <div className="pt-10 px-4 md:px-20 lg:px-16 xl:px-32 2xl:px-64 min-h-[60vh] flex flex-col items-center justify-center gap-4">
            <h1 className="text-2xl font-medium">{t("CartModal.emptyCart")}</h1>
            <Link href="/" className="text-pink-700 hover:underline">
               {t("Checkout.continueShopping")}
            </Link>
         </div>
      );
   }

   // Group cart items by product_id
   const groupedCart = cart.reduce((acc, item) => {
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
      <div className="py-10 px-4 md:px-20 lg:px-16 xl:px-32 2xl:px-64 relative flex flex-col lg:flex-row gap-14 ">
         {/* CART ITEMS */}
         <div className="w-full lg:w-2/3 flex flex-col gap-8">
            <h1 className="text-2xl font-medium">{t("CartModal.myCart")}</h1>
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
                                 <span className="text-xs text-gray-400">{t("CartModal.quantity")}: {item.quantity}</span>
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
                                 <button className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600" style={{ cursor: isLoading ? "not-allowed" : "pointer" }} onClick={() => removeItem(item.id)} disabled={isLoading}>
                                    <X className="size-3.5" />
                                 </button>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>
            ))}
         </div>

         {/* SUMMARY */}
         <div className="w-full lg:w-1/3 h-fit">
            <div className="sticky top-20 p-6 border border-gray-100 rounded-lg shadow-sm">
               <h2 className="text-xl font-medium mb-6">{t("Checkout.orderSummary")}</h2>
               <div className="flex flex-col gap-4">
                  <div className="flex justify-between">
                     <span className="text-gray-500">{t("Orders.subtotal")}</span>
                     <span className="font-semibold">{subTotal} Lei</span>
                  </div>
                  <div className="h-[1px] bg-gray-100" />
                  <div className="flex justify-between text-lg">
                     <span className="font-medium">{t("Orders.total")}</span>
                     <span className="font-semibold">{subTotal} Lei</span>
                  </div>
                  <Link href="/checkout" className="w-full bg-pink-700 text-white py-3 rounded-md font-medium hover:bg-pink-800 transition-colors text-center">
                     {t("Checkout.finalizeOrder")}
                  </Link>
               </div>
            </div>
         </div>
      </div>
   );
}
