"use client";
import { useCartContext } from "@/context/CartContext";
import Image from "next/image";
import { forwardRef } from "react";
import { useRouter } from "next/navigation";
import { CartProduct } from "@/types/product";
import { ShoppingCart, X } from "lucide-react";
import { useTranslations } from "next-intl";

const CartModal = forwardRef<HTMLDivElement, { setIsCartOpen: (value: boolean) => void }>((props, ref) => {
   const t = useTranslations("CartModal");
   const { cart, subTotal, isLoading, removeItem } = useCartContext();
   const router = useRouter();

   const handleCheckout = async () => {
      try {
         props.setIsCartOpen(false);
         router.push("/cart");
      } catch (err) {
         console.log(err);
      }
   };

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
      <div ref={ref} id="cartModal" className="w-[320px] absolute p-3 rounded-md shadow-[0_3px_10px_rgb(0,0,0,0.2)] bg-white top-12 right-0 flex flex-col gap-4 z-20">
         {cart.length == 0 ? (
            <p className="text-sm">{t("emptyCart")}</p>
         ) : (
            <>
               <h2 className="text-base font-medium">{t("myCart")}</h2>
               {/* LIST */}
               <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                  {Object.entries(groupedCart).map(([productId, group]) => (
                     <div key={productId} className="border border-gray-100 rounded-md shadow-sm ">
                        {/* Product Header */}
                        <div className="p-2 bg-gray-50 border-b border-gray-100 max-h-[80px] overflow-hidden">
                           <div className="flex gap-2 items-center">
                              <Image src={group.product_image} alt={group.product_name} width={40} height={40} className="object-contain rounded-md max-h-[40px] max-w-[40px] bg-white" />
                              <h2 className="font-medium text-xs">{group.product_name}</h2>
                           </div>
                        </div>

                        {/* Variants */}
                        <div className="divide-y divide-gray-50">
                           {group.variants.map((item) => {
                              const price = {
                                 price: item.product_price?.toFixed(2).split(".").map(Number) || [0, 0],
                                 discount: item.discount_price?.toFixed(2)?.split(".")?.map(Number),
                              };

                              return (
                                 <div key={item.id} className="py-1.5 px-2 flex justify-between items-center">
                                    <div className="flex flex-col gap-0.5">
                                       <div className="flex gap-1.5 text-xs">
                                          {item.variant_name && <span className="text-gray-500">{item.variant_name}</span>}
                                          {item.sku_variant_name && (
                                             <>
                                                {item.variant_name && <span className="text-gray-300">|</span>}
                                                <span className="text-gray-500">{item.sku_variant_name}</span>
                                             </>
                                          )}
                                       </div>
                                       <span className="text-[10px] text-gray-400">Cantitate: {item.quantity}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                       <div className="text-right">
                                          <div className="relative">
                                             {price.discount ? (
                                                <div className="flex flex-col relative">
                                                   <h3 className="text-[10px] text-gray-500 line-through absolute -top-2 right-0">{(Number(price.price.join(".")) * item.quantity).toFixed(2)} Lei</h3>
                                                   <h2 className="font-medium text-sm text-pink-700">{(Number(price.discount.join(".")) * item.quantity).toFixed(2)} Lei</h2>
                                                </div>
                                             ) : (
                                                <h2 className="font-medium text-sm text-pink-700">{(Number(price.price.join(".")) * item.quantity).toFixed(2)} Lei</h2>
                                             )}
                                          </div>
                                       </div>
                                       <button className="p-0.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600" style={{ cursor: isLoading ? "not-allowed" : "pointer" }} onClick={() => removeItem(item.id)} disabled={isLoading}>
                                          <X className="size-3" />
                                       </button>
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                     </div>
                  ))}
               </div>
               {/* BOTTOM */}
               <div>
                  <div className="h-[1px] bg-gray-100" />
                  <div className="flex items-center justify-between font-medium text-sm my-1">
                     <span>{t("total")}</span>
                     <span>{subTotal} Lei</span>
                  </div>
                  <div className="h-[1px] bg-gray-100" />

                  <button className="rounded-md flex items-center justify-center gap-2 w-full text-sm py-2 px-4 bg-pink-700 text-white mt-2 disabled:cursor-not-allowed disabled:opacity-75 hover:bg-pink-800" disabled={isLoading} onClick={handleCheckout}>
                     <ShoppingCart className="text-white fill-current size-4" /> {t("viewDetails")}
                  </button>
               </div>
            </>
         )}
      </div>
   );
});
CartModal.displayName = "CartModal";

export default CartModal;
