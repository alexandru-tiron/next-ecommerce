"use client";
// CartContext.tsx
import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState, FC, useRef } from "react";
import { db } from "@/lib/firebaseInit";
import { collection, deleteDoc, doc, DocumentData, getDoc, getDocs, limit, onSnapshot, query, QuerySnapshot, QueryDocumentSnapshot, setDoc, updateDoc, where } from "firebase/firestore";
import { v4 } from "uuid";
import { useAuthContext } from "./AuthContext";
import { CartProduct } from "@/types/product";

interface CartContextProps {
   cart: CartProduct[];
   isLoading: boolean;
   counter: number;
   subTotal: number;
   addItem: (product_id: string, product_name: string, product_code: string, product_image: string, product_price: number, quantity: number, variant_id?: string, variant_name?: string, sku_variant_id?: string, sku_variant_name?: string) => void;
   removeItem: (id: string) => void;
   clearCart: () => Promise<void>;
   clearLocalCart: () => Promise<void>;
   reconstructCart: (products: CartProduct[]) => Promise<void>;
}

interface CartProviderProps {
   children: ReactNode;
}
const CartContext = createContext<CartContextProps | null>(null);

export const CartProvider: FC<CartProviderProps> = ({ children }: { children: ReactNode }) => {
   const [cart, setCart] = useState<CartProduct[]>([]);
   const [isLoading, setIsLoading] = useState<boolean>(false);
   const [counter, setCounter] = useState<number>(0);
   const [subTotal, setSubTotal] = useState<number>(0);
   const { user } = useAuthContext();
   const prevUserRef = useRef<typeof user>(null);

   // Define the addItem function first
   const addItem = useCallback(
      async (product_id: string, product_name: string, product_code: string, product_image: string, product_price: number, quantity: number, variant_id?: string, variant_name?: string, sku_variant_id?: string, sku_variant_name?: string) => {
         setIsLoading(true);
         if (!user) {
            // Check for exact match including variants
            const existingItemIndex = cart.findIndex((i) => i.product_id === product_id && i.variant_id === variant_id && i.sku_variant_id === sku_variant_id);

            if (existingItemIndex !== -1) {
               const newCart = [...cart];
               newCart[existingItemIndex].quantity += quantity;
               setCart(newCart);
            } else {
               const newCartProduct: CartProduct = {
                  id: v4(),
                  product_id,
                  product_name,
                  product_code,
                  product_image,
                  product_price,
                  quantity,
               };
               if (variant_id) {
                  newCartProduct.variant_id = variant_id;
                  newCartProduct.variant_name = variant_name;
               }
               if (sku_variant_id) {
                  newCartProduct.sku_variant_id = sku_variant_id;
                  newCartProduct.sku_variant_name = sku_variant_name;
                  // Get SKU variant price from the product
                  const skuSnap = await getDoc(doc(db, "Products", product_id, "SkuVariants", sku_variant_id));
                  if (skuSnap.exists()) {
                     newCartProduct.product_price = skuSnap.data().price;
                     if (skuSnap.data().discount) {
                        newCartProduct.discount = skuSnap.data().discount;
                        newCartProduct.discount_price = skuSnap.data().discount_price;
                     }
                  }
               }
               setCart([...cart, newCartProduct]);
            }
            setIsLoading(false);
         } else {
            try {
               // For logged-in users, check for exact match including variants
               const cartQuery = query(collection(db, "Users", user.uid, "Cart"), where("product_id", "==", product_id), where("variant_id", "==", variant_id || null), where("sku_variant_id", "==", sku_variant_id || null), limit(1));

               const querySnapshot = await getDocs(cartQuery);
               const productArray = querySnapshot.docs.map((item) => ({
                  id: item.id,
                  ...item.data(),
               }));

               if (productArray.length === 0) {
                  const newItem = doc(collection(db, "Users", user.uid, "Cart"));
                  const newCartProduct: Partial<CartProduct> = {
                     product_id,
                     product_name,
                     product_code,
                     product_image,
                     product_price,
                     quantity,
                  };
                  if (variant_id) {
                     newCartProduct.variant_id = variant_id;
                     newCartProduct.variant_name = variant_name;
                  }
                  if (sku_variant_id) {
                     newCartProduct.sku_variant_id = sku_variant_id;
                     newCartProduct.sku_variant_name = sku_variant_name;
                     // Get SKU variant price from the product
                     const skuSnap = await getDoc(doc(db, "Products", product_id, "SkuVariants", sku_variant_id));
                     if (skuSnap.exists()) {
                        newCartProduct.product_price = skuSnap.data().price;
                        if (skuSnap.data().discount) {
                           newCartProduct.discount = skuSnap.data().discount;
                           newCartProduct.discount_price = skuSnap.data().discount_price;
                        }
                     }
                  }
                  await setDoc(newItem, newCartProduct);
               } else {
                  const newItem = doc(db, "Users", user.uid, "Cart", productArray[0].id);
                  await updateDoc(newItem, {
                     quantity: (productArray[0] as CartProduct).quantity + quantity,
                  });
               }
               setIsLoading(false);
            } catch (error) {
               console.log(error);
            }
         }
      },
      [cart, user]
   );

   // Function to migrate localStorage cart to user's Firestore cart
   const migrateLocalCartToUser = useCallback(async () => {
      try {
         const localCart = localStorage.getItem("myCart");
         if (localCart) {
            const localCartItems = JSON.parse(localCart) as CartProduct[];

            // Only proceed if there are items to migrate
            if (localCartItems.length > 0) {
               setIsLoading(true);

               // For each item in the local cart, add it to the user's cart
               for (const item of localCartItems) {
                  await addItem(item.product_id, item.product_name, item.product_code, item.product_image, item.product_price, item.quantity, item.variant_id, item.variant_name, item.sku_variant_id, item.sku_variant_name);
               }

               // Clear the local cart after migration
               localStorage.setItem("myCart", JSON.stringify([]));
            }
         }
      } catch (error) {
         console.error("Error migrating local cart to user:", error);
      } finally {
         setIsLoading(false);
      }
   }, [addItem]);

   // Effect to handle cart migration when user logs in
   useEffect(() => {
      // Check if user just logged in (wasn't logged in before, but now is)
      const isJustLoggedIn = !prevUserRef.current && user;

      // If user just logged in and we have items in localStorage
      if (isJustLoggedIn) {
         migrateLocalCartToUser();
      }

      // Update the previous user reference
      prevUserRef.current = user;
   }, [user, migrateLocalCartToUser]);

   useEffect(() => {
      if (user) {
         const userRef = collection(db, "Users", user.uid, "Cart");
         const unsubscribeCart = onSnapshot(userRef, async (querySnapshot: QuerySnapshot<DocumentData>) => {
            const fetchPromises = querySnapshot.docs.map(async (item: QueryDocumentSnapshot<DocumentData>) => {
               const cartProduct = {
                  id: item.id,
                  ...item.data(),
               };
               if (item.data().sku_variant_id) {
                  const skuSnap = await getDoc(doc(db, "Products", item.data().product_id, "SkuVariants", item.data().sku_variant_id));
                  if (skuSnap.exists()) {
                     (cartProduct as CartProduct).product_price = skuSnap.data().price;
                     if (skuSnap.data().discount) {
                        (cartProduct as CartProduct).discount = skuSnap.data().discount;
                        (cartProduct as CartProduct).discount_price = skuSnap.data().discount_price;
                     }
                  }
               }
               return cartProduct as CartProduct;
            });
            const cartData = await Promise.all(fetchPromises);
            setCart(cartData as CartProduct[]);
            const subtotal = cartData.reduce((acc, cur) => {
               const price = cur.discount_price ?? cur.product_price;
               return acc + price * cur.quantity;
            }, 0);
            setSubTotal(Number(subtotal.toFixed(2)));
            setCounter(cartData.reduce((acc, cur) => acc + cur.quantity, 0));
         });
         return () => unsubscribeCart();
      } else {
         try {
            const locales = localStorage.getItem("myCart");
            if (locales) {
               const localCart = JSON.parse(locales);
               setCart(localCart);
               const subtotal = localCart.reduce((acc: number, cur: CartProduct) => {
                  const price = cur.discount_price ?? cur.product_price;
                  return acc + price * cur.quantity;
               }, 0);
               setSubTotal(Number(subtotal.toFixed(2)));
               setCounter(localCart.reduce((acc: number, cur: { quantity: number }) => acc + cur.quantity, 0));
            }
         } catch (error) {
            console.log(error);
            return;
         }
      }
   }, [user]);

   useEffect(() => {
      const subtotal = cart.reduce((acc, cur) => {
         const price = cur.discount_price ?? cur.product_price;
         return acc + price * cur.quantity;
      }, 0);
      setSubTotal(Number(subtotal.toFixed(2)));
      setCounter(cart.reduce((acc, cur) => acc + cur.quantity, 0));
      localStorage.setItem("myCart", JSON.stringify(cart));
   }, [cart]);

   const removeItem = useCallback(
      async (id: string) => {
         setIsLoading(true);
         if (!user) {
            if (cart.some((i) => i.id == id)) {
               setCart(cart.filter((item) => item.id != id));
            }
            setIsLoading(false);
         } else {
            try {
               const querySnapshot = await getDoc(doc(db, "Users", user.uid, "Cart", id));
               if (!querySnapshot.exists()) {
                  return;
               } else {
                  await deleteDoc(doc(db, "Users", user.uid, "Cart", id));
               }
               setIsLoading(false);
            } catch (error) {
               console.log(error);
            }
         }
      },
      [cart, user]
   );

   const clearCart = useCallback(async () => {
      setIsLoading(true);
      if (!user) {
         // For non-logged in users, just clear the local cart
         setCart([]);
         localStorage.setItem("myCart", JSON.stringify([]));
         setIsLoading(false);
      } else {
         try {
            // For logged-in users, delete all items from the Cart subcollection
            const cartRef = collection(db, "Users", user.uid, "Cart");
            const cartSnapshot = await getDocs(cartRef);

            const deletePromises = cartSnapshot.docs.map((doc) => deleteDoc(doc.ref));

            await Promise.all(deletePromises);
            setIsLoading(false);
         } catch (error) {
            console.error("Error clearing cart:", error);
            setIsLoading(false);
         }
      }
   }, [user]);
   const clearLocalCart = useCallback(async () => {
      setIsLoading(true);
      setCart([]);
      localStorage.setItem("myCart", JSON.stringify([]));
      setIsLoading(false);
   }, []);

   const reconstructCart = useCallback(
      async (products: CartProduct[]) => {
         setIsLoading(true);
         try {
            // Clear existing cart first
            await clearCart();

            // Add each product to the cart
            for (const product of products) {
               await addItem(product.product_id, product.product_name, product.product_code, product.product_image, product.product_price, product.quantity, product.variant_id, product.variant_name, product.sku_variant_id, product.sku_variant_name);
            }
         } catch (error) {
            console.error("Error reconstructing cart:", error);
         } finally {
            setIsLoading(false);
         }
      },
      [addItem, clearCart]
   );

   // Update the cartState with new functions
   const cartState = useMemo(
      () => ({
         cart,
         isLoading,
         counter,
         addItem,
         removeItem,
         subTotal,
         clearCart,
         clearLocalCart,
         reconstructCart,
      }),
      [cart, counter, isLoading, subTotal, addItem, removeItem, clearCart, clearLocalCart, reconstructCart]
   );

   return <CartContext.Provider value={cartState}>{children}</CartContext.Provider>;
};

export const useCartContext = () => {
   const context = useContext(CartContext);
   if (!context) {
      // context returns null here
      throw new Error("useLoading must be used within a LoadingProvider", {
         cause: context,
      });
   }
   return context;
};
