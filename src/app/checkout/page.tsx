"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePopupContext } from "@/context/PopupContext";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import handleResendVerificationEmail from "@/state/auth/actions/handleResendVerificationEmail";
import { clearCart, reconstructCart } from "@/state/cart/cartSlice";
import Image from "next/image";
import Link from "next/link";
import { Address, Order, Shipping } from "@/types/user";
import { CheckCircle, Circle, ChevronDown, ChevronUp, MapPin, Truck, AlertCircle, Loader2, Mail, User } from "lucide-react";
import { availablePaymentMethods, PaymentMethod, startCardPayment } from "@/lib/payments";
import { getPaymentSettings } from "@/queries/fetchPaymentSettings";
import { getFunctions, httpsCallable } from "firebase/functions";
import { FirebaseError } from "firebase/app";
import { CartProduct } from "@/types/product";
import { validateName, validateEmail, validatePhone } from "@core/validators";
import app, { auth } from "@/lib/firebaseInit";
import { getShippData } from "@/queries";
import { useTranslations } from "next-intl";
import VatNote from "@/components/common/VatNote";
// ResponseData interface for API responses
interface ResponseData {
   success: boolean;
   status: number;
   orderId?: string;
   error?: string;
   invalidProducts?: Array<{
      id: string;
      reason: string;
   }>;
}

export default function CheckoutPage() {
   const router = useRouter();
   const t = useTranslations();
   const dispatch = useAppDispatch();
   const { user, isAuthReady } = useAppSelector((state) => state.auth);
   const { cart, subTotal } = useAppSelector((state) => state.cart);
   const { setPopup } = usePopupContext();
   const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null);
   const [selectedBillingId, setSelectedBillingId] = useState<string | null>(null);
   const [isBusinessOrder, setIsBusinessOrder] = useState(false);
   const [voucherCode, setVoucherCode] = useState("");
   const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(["cod"]);
   const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
   const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; discount: number } | null>(null);
   const [voucherError, setVoucherError] = useState("");
   const [isCheckingVoucher, setIsCheckingVoucher] = useState(false);
   const [isProcessing, setIsProcessing] = useState(false);
   const [showAddressDropdown, setShowAddressDropdown] = useState(false);
   const [showBillingDropdown, setShowBillingDropdown] = useState(false);
   const [fieldErrors, setFieldErrors] = useState({
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
   });
   const [shipping, setShipping] = useState<Shipping | null>(null);
   const [isSendingVerification, setIsSendingVerification] = useState(false);
   const [firstName, setFirstName] = useState(user?.db?.first_name || "");
   const [lastName, setLastName] = useState(user?.db?.last_name || "");
   const [email, setEmail] = useState(user?.email || "");
   const [phoneNumber, setPhoneNumber] = useState(user?.db?.phone_no || "");

   useEffect(() => {
      getShippData().then(setShipping);
   }, []);

   // Free above the threshold when the store has one; follows the cart as it loads and changes
   const shippingCost = !shipping ? 0 : shipping.enable_threshold && subTotal >= shipping.free_shipping_threshold ? 0 : shipping.default_price;
   const total = subTotal + shippingCost;

   // Previews the voucher; the order function checks and applies it again when the order is placed
   const applyVoucher = async (code: string) => {
      if (!code.trim()) return;
      setIsCheckingVoucher(true);
      setVoucherError("");
      try {
         const checkVoucher = httpsCallable<{ code: string; subtotal: number }, { valid: boolean; code?: string; discount?: number; message?: string }>(getFunctions(app, "europe-west3"), "checkVoucher");
         const { data } = await checkVoucher({ code, subtotal: subTotal });
         if (data.valid && data.code) {
            setAppliedVoucher({ code: data.code, discount: data.discount ?? 0 });
            setVoucherCode(data.code);
         } else {
            setAppliedVoucher(null);
            setVoucherError(data.message || t("Checkout.invalidVoucher"));
         }
      } catch (error) {
         console.error("Voucher check error:", error);
         setAppliedVoucher(null);
         setVoucherError(t("Checkout.voucherCheckError"));
      } finally {
         setIsCheckingVoucher(false);
      }
   };

   // Only the payment methods enabled in the admin settings are offered
   useEffect(() => {
      getPaymentSettings().then((settings) => {
         const methods = availablePaymentMethods(settings);
         setPaymentMethods(methods);
         setPaymentMethod((current) => (methods.includes(current) ? current : methods[0]));
      });
   }, []);

   // A percentage voucher depends on the subtotal, so check it again when the cart changes
   useEffect(() => {
      if (appliedVoucher) applyVoucher(appliedVoucher.code);
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [subTotal]);

   const voucherDiscount = appliedVoucher?.discount ?? 0;
   const grandTotal = Math.max(Number((total - voucherDiscount).toFixed(2)), 0);

   // Redirect to cart if it's empty
   useEffect(() => {
      if (cart.length === 0) {
         router.push("/cart");
      }
   }, [cart, router]);

   // Redirect to login if not authenticated (once Firebase has restored any existing session)
   useEffect(() => {
      if (isAuthReady && !user) {
         router.push("/login?redirect=/checkout");
      }
   }, [user, isAuthReady, router]);

   // Set default addresses when user data is loaded
   useEffect(() => {
      if (user?.db) {
         // Set shipping address if user has a default
         if (user.db.shipping_address_id && user.db.addresses) {
            setSelectedShippingId(user.db.shipping_address_id);
         } else if (user.db.addresses && user.db.addresses.length > 0) {
            // Set first address as default if no default is set
            setSelectedShippingId(user.db.addresses[0].id);
         }
         // Set billing address if user has a default
         if (user.db.billing_address_id && user.db.addresses) {
            setSelectedBillingId(user.db.billing_address_id);
         } else if (user.db.addresses && user.db.addresses.length > 0) {
            // Set first address as default if no default is set
            setSelectedBillingId(user.db.addresses[0].id);
         }
      }
   }, [user]);

   // Set isBusinessOrder based on selected billing address
   useEffect(() => {
      if (user?.db?.addresses && selectedBillingId) {
         const selectedBillingAddress = user.db.addresses.find((addr) => addr.id === selectedBillingId);
         if (selectedBillingAddress) {
            setIsBusinessOrder(!!selectedBillingAddress.business);
         }
      }
   }, [selectedBillingId, user?.db?.addresses]);

   const handleResendVerification = async () => {
      try {
         setIsSendingVerification(true);
         await dispatch(handleResendVerificationEmail());
      } catch (error) {
         console.error("Error sending verification email:", error);
      } finally {
         setIsSendingVerification(false);
      }
   };

   // Get selected shipping address
   const getSelectedShippingAddress = (): Address | null => {
      if (!user?.db?.addresses || !selectedShippingId) return null;
      return user.db.addresses.find((addr) => addr.id === selectedShippingId) || null;
   };

   // Get selected billing address
   const getSelectedBillingAddress = (): Address | null => {
      if (!user?.db?.addresses || !selectedBillingId) return null;
      return user.db.addresses.find((addr) => addr.id === selectedBillingId) || null;
   };

   // Format address for display
   const formatAddress = (addr: Address) => {
      return (
         <>
            <p className="font-medium">
               {addr.street} {addr.street_no}
               {addr.building && `, ${t("Addresses.buildingShort")} ${addr.building}`}
               {addr.building_no && `, ${t("Addresses.buildingNoShort")} ${addr.building_no}`}
               {addr.apartment && `, ${t("Addresses.apartmentShort")} ${addr.apartment}`}
               {addr.floor ? `, ${t("Addresses.floorShort")} ${addr.floor}` : ""}
            </p>
            <p className="text-gray-600 text-sm">
               {addr.city}, {addr.county}, {addr.postal_code}
            </p>
            {addr.details && <p className="text-gray-500 text-xs mt-1">{addr.details}</p>}
         </>
      );
   };

   // Function to show error popup
   const showErrorPopup = (errorMessage: string) => {
      setPopup({
         title: t("Checkout.error"),
         description: [<p key="error-msg">{errorMessage}</p>],
         buttons: [{ label: t("Profile.understand"), onClick: () => {}, className: "primary" }],
      });
   };

   // Handle checkout submission
   const handlePlaceOrder = async () => {
      // Validation checks
      if (!cart.length) {
         showErrorPopup(t("Checkout.cartNoProducts"));
         return;
      }

      if (!user) {
         router.push("/login?redirect=/checkout");
         return;
      }

      // Check if email is verified
      if (user.emailVerified === false) {
         showErrorPopup(t("Checkout.emailNotVerifiedError"));
         return;
      }

      if (!firstName || !validateName(firstName)) {
         showErrorPopup(t("Login.firstNameRequired"));
         setFieldErrors({ ...fieldErrors, firstName: t("Login.firstNameRequired") });
         return;
      }

      if (!lastName || !validateName(lastName)) {
         showErrorPopup(t("Login.lastNameRequired"));
         setFieldErrors({ ...fieldErrors, lastName: t("Login.lastNameRequired") });
         return;
      }

      if (!email || !validateEmail(email)) {
         showErrorPopup(t("Login.emailRequired"));
         setFieldErrors({ ...fieldErrors, email: t("Login.emailRequired") });
         return;
      }

      if (!phoneNumber || !validatePhone(phoneNumber)) {
         showErrorPopup(t("Login.phoneRequired"));
         setFieldErrors({ ...fieldErrors, phoneNumber: t("Login.phoneRequired") });
         return;
      }

      if (!selectedShippingId) {
         showErrorPopup(t("Checkout.selectShippingAddress"));
         return;
      }

      if (!selectedBillingId) {
         showErrorPopup(t("Checkout.selectBillingAddress"));
         return;
      }

      // Get the selected shipping and billing addresses
      const selectedShippingAddress = getSelectedShippingAddress();
      const selectedBillingAddress = getSelectedBillingAddress();

      if (!selectedShippingAddress) {
         showErrorPopup(t("Checkout.shippingAddressNotFound"));
         return;
      }

      if (!selectedBillingAddress) {
         showErrorPopup(t("Checkout.billingAddressNotFound"));
         return;
      }

      // If this is a business order, check if business details exist in the billing address
      if (isBusinessOrder && selectedBillingAddress) {
         if (!selectedBillingAddress.business || !selectedBillingAddress.business_details?.cui || !selectedBillingAddress.business_details?.name || !selectedBillingAddress.business_details?.reg_no) {
            showErrorPopup(t("Checkout.businessDetailsRequired"));
            return;
         }
      }

      try {
         setIsProcessing(true);
         const token = await auth.currentUser?.getIdTokenResult();

         // Prepare order data
         const orderData: Omit<Order, "id" | "date" | "status" | "tracking_number"> & { idempotency_key: string } = {
            user_id: user.uid,
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone_no: phoneNumber,
            shipping_address_id: selectedShippingId,
            billing_address_id: selectedBillingId,
            shipping_address: selectedShippingAddress,
            billing_address: selectedBillingAddress,
            voucher: !!appliedVoucher,
            ...(appliedVoucher ? { voucher_id: appliedVoucher.code } : {}),
            is_business: isBusinessOrder,
            payment_method: paymentMethod,
            products: cart.map(
               (item) =>
                  ({
                     id: item.id,
                     product_id: item.product_id,
                     product_name: item.product_name,
                     product_code: item.product_code,
                     product_price: item.product_price,
                     discount: item.discount,
                     ...(item.discount_price ? { discount_price: item.discount_price } : {}),
                     quantity: item.quantity,
                     ...(item.variant_id ? { variant_id: item.variant_id } : {}),
                     ...(item.variant_name ? { variant_name: item.variant_name } : {}),
                     ...(item.sku_variant_id ? { sku_variant_id: item.sku_variant_id } : {}),
                     ...(item.sku_variant_name ? { sku_variant_name: item.sku_variant_name } : {}),
                     product_image: item.product_image,
                  } as CartProduct)
            ),
            shipping_price: shippingCost,
            total: grandTotal,
            // Add idempotency key to prevent duplicate orders
            idempotency_key: `${user.uid}_${token?.token}_${Date.now()}`,
         };

         // Use Firebase Functions SDK to call the Cloud Function
         const functions = getFunctions(app, "europe-west3");
         const validateAndCreateOrderFn = httpsCallable(functions, "validateAndCreateOrder");
         const result = await validateAndCreateOrderFn(orderData);
         const responseData = result.data as ResponseData;

         // Handle response based on status
         if (responseData.status !== 200) {
            // Handle specific error status codes
            switch (responseData.status) {
               case 401:
                  showErrorPopup(t("Checkout.sessionExpired"));
                  router.push("/login?redirect=/checkout");
                  break;
               case 404:
                  showErrorPopup(t("Checkout.addressNotFound"));
                  break;
               case 406:
                  showErrorPopup(t("Checkout.invalidOrderDetails"));
                  break;
               case 412:
                  showErrorPopup(t("Checkout.incompleteBusinessDetails"));
                  break;
               case 422:
                  if (responseData.invalidProducts && responseData.invalidProducts.length > 0) {
                     // Get the list of invalid product IDs
                     const invalidProductIds = responseData.invalidProducts.map((p: { id: string }) => p.id);

                     // Filter out invalid products from the cart
                     const validProducts = cart.filter((product) => !invalidProductIds.includes(product.id));

                     // Reconstruct the cart with only valid products
                     await dispatch(reconstructCart(validProducts));

                     // Format invalid products error message
                     const productErrorsList = responseData.invalidProducts.map((p: { id: string; reason: string }) => `• ${p.reason}`).join("\n");

                     console.error("Invalid products:", productErrorsList);
                     showErrorPopup(`${t("Checkout.invalidProductsEliminated")}\n${productErrorsList}`);
                  } else {
                     showErrorPopup(responseData.error || t("Checkout.invalidProducts"));
                  }
                  break;
               case 429:
                  showErrorPopup(t("Checkout.tooManyRequests"));
                  break;
               default:
                  showErrorPopup(responseData.error || t("Checkout.orderError"));
            }
         } else if (responseData.success && responseData.orderId) {
            // Order successfully created
            await dispatch(clearCart());
            if (paymentMethod !== "cod") {
               // Card payments continue on the provider's payment page; if that can't start, the order page offers to retry
               try {
                  window.location.assign(await startCardPayment(responseData.orderId, paymentMethod));
               } catch (paymentError) {
                  console.error("Payment start error:", paymentError);
                  router.push(`/profile/orders/${responseData.orderId}?payment=failed`);
               }
               return;
            }
            router.push(`/checkout/success?order=${responseData.orderId}`);
         } else {
            // Handle unexpected success response without order ID
            showErrorPopup(t("Checkout.orderError"));
         }
      } catch (error: unknown) {
         console.error("Order error:", error);
         // Improved error handling for Firebase HttpsError and network errors
         if (error && typeof error === "object" && "code" in error) {
            // This is a Firebase HttpsError
            const firebaseError = error as FirebaseError;
            switch (firebaseError.code) {
               // Authentication errors
               case "unauthenticated":
                  if (firebaseError.message.includes("nu a fost verificat")) {
                     showErrorPopup(t("Checkout.emailNotVerifiedError"));
                  } else {
                     showErrorPopup(t('Checkout.userNotAuthenticated'));
                     router.push("/login?redirect=/checkout");
                  }
                  break;

               // Resource exhaustion errors
               case "resource-exhausted":
                  if (firebaseError.message.includes("Prea multe comenzi")) {
                     showErrorPopup(t("Checkout.tooManyOrders"));
                  } else {
                     showErrorPopup(t("Checkout.tooManyRequests"));
                  }
                  break;

               // Duplicate order error
               case "already-exists":
                  showErrorPopup(t("Checkout.orderAlreadyExists"));
                  break;

               // Invalid argument errors (validation errors)
               case "invalid-argument":
                  if (firebaseError.message.includes("Prenumele")) {
                     showErrorPopup(t("Login.firstNameInvalid"));
                     setFieldErrors({ ...fieldErrors, firstName: t("Login.firstNameInvalid") });
                  } else if (firebaseError.message.includes("Numele")) {
                     showErrorPopup(t("Login.lastNameInvalid"));
                     setFieldErrors({ ...fieldErrors, lastName: t("Login.lastNameInvalid") });
                  } else if (firebaseError.message.includes("Emailul")) {
                     showErrorPopup(t("Login.emailInvalid"));
                     setFieldErrors({ ...fieldErrors, email: t("Login.emailInvalid") });
                  } else if (firebaseError.message.includes("telefon")) {
                     showErrorPopup(t("Login.phoneInvalid"));
                     setFieldErrors({ ...fieldErrors, phoneNumber: t("Login.phoneInvalid") });
                  } else if (firebaseError.message.includes("Adresa de livrare lipsește")) {
                     showErrorPopup(t("Checkout.missingShippingAddress"));
                  } else if (firebaseError.message.includes("Adresa de facturare lipsește")) {
                     showErrorPopup(t("Checkout.missingBillingAddress"));
                  } else if (firebaseError.message.includes("Adresa de livrare este incompletă")) {
                     showErrorPopup(t("Checkout.invalidShippingAddress"));
                  } else if (firebaseError.message.includes("Adresa de facturare pentru firmă")) {
                     showErrorPopup(t("Checkout.invalidBusinessAddress"));
                  } else if (firebaseError.message.includes("Adresa de facturare este incompletă")) {
                     showErrorPopup(t("Checkout.invalidBillingAddress"));
                  } else if (firebaseError.message.includes("Pentru comandă pe firmă")) {
                     showErrorPopup(t("Checkout.businessOrderRequired"));
                  } else if (firebaseError.message.includes("Datele comenzii sunt invalide")) {
                     showErrorPopup(t("Checkout.invalidOrderDetails"));
                  } else {
                     showErrorPopup(t("Checkout.invalidInputData"));
                  }
                  break;

               // Not found errors
               case "not-found":
                  if (firebaseError.message.includes("Adresa de livrare")) {
                     showErrorPopup(t("Checkout.shippingAddressNotFound"));
                  } else if (firebaseError.message.includes("Adresa de facturare")) {
                     showErrorPopup(t("Checkout.billingAddressNotFound"));
                  } else {
                     showErrorPopup(t("Checkout.resourceNotFound"));
                  }
                  break;

               // Product validation errors
               case "aborted":
                  if (firebaseError.customData && typeof firebaseError.customData === "object" && "invalidProducts" in firebaseError.customData) {
                     // Get the list of invalid product IDs
                     const invalidProductsList = firebaseError.customData.invalidProducts as Array<{ id: string; reason: string }>;
                     const invalidProductIds = invalidProductsList.map((p) => p.id);

                     // Filter out invalid products from the cart
                     const validProducts = cart.filter((product) => !invalidProductIds.includes(product.id));

                     // Reconstruct the cart with only valid products
                     await dispatch(reconstructCart(validProducts));

                     // Format error message for display
                     const productErrorsList = invalidProductsList.map((p) => `• ${p.reason}`).join("\n");

                     showErrorPopup(`${t("Checkout.invalidProductsEliminated")}\n${productErrorsList}`);
                  } else {
                     showErrorPopup(t("Checkout.invalidProducts"));
                  }
                  break;

               // Server errors
               case "internal":
                  showErrorPopup(t("Checkout.internalError"));
                  break;

               // Permission errors
               case "permission-denied":
                  showErrorPopup(t("Checkout.permissionDenied"));
                  break;

               // Timeout errors
               case "deadline-exceeded":
                  showErrorPopup(t("Checkout.timeoutError"));
                  break;

               // Unavailable service
               case "unavailable":
                  showErrorPopup(t("Checkout.serviceUnavailable"));
                  break;

               // Other Firebase errors
               default:
                  showErrorPopup(`${t("Checkout.error")}: ${firebaseError.message || t("Checkout.orderError")}`);
            }
         } else if (error instanceof TypeError) {
            // Handle TypeError instances like network errors
            if (error.message.includes("NetworkError")) {
               showErrorPopup(t("Checkout.networkError"));
            } else if (error.message.includes("Failed to fetch")) {
               showErrorPopup(t("Checkout.serverError"));
            } else {
               showErrorPopup(t("Checkout.systemError"));
            }
         } else {
            // For other types of errors, try to extract useful information
            const errorMessage = error instanceof Error ? error.message : "";
            if (errorMessage.includes("timeout")) {
               showErrorPopup(t("Checkout.timeoutError"));
            } else if (errorMessage.includes("CORS")) {
               showErrorPopup(t("Checkout.securityError"));
            } else if (error instanceof Error && error.name === "AbortError") {
               showErrorPopup(t("Checkout.requestAborted"));
            } else if (error instanceof Error && error.name === "SyntaxError") {
               showErrorPopup(t("Checkout.dataProcessingError"));
            } else {
               showErrorPopup(t("Checkout.unexpectedError"));
            }
         }
      } finally {
         setIsProcessing(false);
      }
   };

   // If user is not logged in, redirect to login
   if (!user) {
      return (
         <div className="pt-10 px-4 md:px-20 lg:px-16 xl:px-32 2xl:px-64 pb-16 flex justify-center items-center min-h-[50vh]">
            <div className="text-center">
               <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-pink-600" />
               <p>{t("Checkout.redirectToLogin")}</p>
            </div>
         </div>
      );
   }
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
      <div className="pt-10 px-4 md:px-20 lg:px-16 xl:px-32 2xl:px-64 pb-16">
         <div className="mb-6">
            <Link href="/cart" className="text-gray-500 hover:text-gray-700 flex items-center gap-2">
               <ChevronUp className="rotate-90 w-4 h-4" />
               <span>{t("Checkout.backToCart")}</span>
            </Link>
         </div>

         <h1 className="text-2xl font-semibold mb-8">{t("Checkout.finalizeOrder")}</h1>

         {/* Email verification warning */}
         {user.emailVerified === false && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 flex items-start">
               <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
               <div className="flex-1">
                  <p className="text-red-800 font-medium">{t("Checkout.emailNotVerified")}</p>
                  <p className="text-red-700 text-sm mt-1">{t("Checkout.emailNotVerifiedDescription")}</p>
                  <button onClick={handleResendVerification} disabled={isSendingVerification} className="mt-2 inline-flex items-center px-3 py-1.5 text-sm rounded-md bg-red-100 text-red-800 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed">
                     {isSendingVerification ? (
                        <>
                           <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                           {t("Checkout.sending")}
                        </>
                     ) : (
                        <>
                           <Mail className="w-4 h-4 mr-2" />
                           {t("Checkout.resendVerification")}
                        </>
                     )}
                  </button>
               </div>
            </div>
         )}

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column - Customer information */}
            <div className="lg:col-span-2 space-y-6 ">
               <div className="flex flex-col gap-4 bg-white p-6 rounded-lg shadow-sm border border-gray-100 ">
                  <h2 className="text-lg font-medium flex items-center">
                     <User className="w-5 h-5 mr-2 text-pink-600" />
                     {t("Checkout.clientInfo")}
                  </h2>
                  <div className="flex flex-col gap-4 md:flex-row">
                     <div className="flex flex-col gap-2 w-full">
                        <label className="text-sm text-gray-700">{t("Login.lastName")} *</label>
                        <input type="text" name="username" placeholder={t("Login.placeholderLastName")} value={lastName} className={`ring-2 ${fieldErrors.lastName ? "ring-red-300" : "ring-gray-300"} rounded-md p-2 placeholder:text-sm`} onChange={(e) => setLastName(e.target.value)} />
                        {fieldErrors.lastName && <p className="text-red-500 text-xs mt-1">{fieldErrors.lastName}</p>}
                     </div>
                     <div className="flex flex-col gap-2 w-full">
                        <label className="text-sm text-gray-700">{t("Login.firstName")} *</label>
                        <input type="text" name="username" placeholder={t("Login.placeholderFirstName")} value={firstName} className={`ring-2 ${fieldErrors.firstName ? "ring-red-300" : "ring-gray-300"} rounded-md p-2 placeholder:text-sm`} onChange={(e) => setFirstName(e.target.value)} />
                        {fieldErrors.firstName && <p className="text-red-500 text-xs mt-1">{fieldErrors.firstName}</p>}
                     </div>
                  </div>

                  <div className="flex flex-col gap-4 md:flex-row">
                     <div className="flex flex-col gap-2 w-full">
                        <label className="text-sm text-gray-700">{t("Login.email")} *</label>
                        <input type="email" name="email" placeholder={t("Login.placeholderEmail")} value={email} className={`ring-2 ${fieldErrors.email ? "ring-red-300" : "ring-gray-300"} rounded-md p-2 placeholder:text-sm`} onChange={(e) => setEmail(e.target.value)} />
                        {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
                     </div>
                     <div className="flex flex-col gap-2 w-full">
                        <label className="text-sm text-gray-700">{t("Login.phoneNumber")} *</label>
                        <input type="tel" name="phone" placeholder={t("Login.placeholderPhoneNumber")} value={phoneNumber} className={`ring-2 ${fieldErrors.phoneNumber ? "ring-red-300" : "ring-gray-300"} rounded-md p-2 placeholder:text-sm`} onChange={(e) => setPhoneNumber(e.target.value)} />
                        {fieldErrors.phoneNumber && <p className="text-red-500 text-xs mt-1">{fieldErrors.phoneNumber}</p>}
                     </div>
                  </div>
               </div>

               {/* Shipping Address */}
               <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                     <h2 className="text-lg font-medium flex items-center">
                        <MapPin className="w-5 h-5 mr-2 text-pink-600" />
                        {t("Orders.shippingAddress")}
                     </h2>
                     <button className="text-pink-600 text-sm font-medium" onClick={() => setShowAddressDropdown(!showAddressDropdown)}>
                        {t("Checkout.change")}
                        {showAddressDropdown ? <ChevronUp className="w-4 h-4 ml-1 inline" /> : <ChevronDown className="w-4 h-4 ml-1 inline" />}
                     </button>
                  </div>

                  {showAddressDropdown && user?.db?.addresses && user.db.addresses.length > 0 && (
                     <div className="mb-4 bg-gray-50 p-3 rounded-md border border-gray-100">
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                           {user?.db?.addresses.map((addr) => (
                              <button
                                 key={addr.id}
                                 className={`w-full text-left p-3 rounded-md border ${selectedShippingId === addr.id ? "border-pink-600 bg-pink-50" : "border-gray-200 hover:border-gray-300"}`}
                                 onClick={() => {
                                    setSelectedShippingId(addr.id);
                                    setShowAddressDropdown(false);
                                 }}
                              >
                                 {formatAddress(addr)}
                              </button>
                           ))}
                        </div>
                        <div className="mt-3 text-center">
                           <Link href="/profile?tab=addresses" className="text-pink-600 hover:text-pink-700 text-sm font-medium">
                              {t("Checkout.addNewAddress")}
                           </Link>
                        </div>
                     </div>
                  )}

                  <div className="border border-gray-100 rounded-md p-4">
                     {user?.db?.addresses && user.db.addresses.length > 0 ? (
                        getSelectedShippingAddress() ? (
                           formatAddress(getSelectedShippingAddress()!)
                        ) : (
                           <p className="text-gray-500">{t("Checkout.noAddressSelected")}</p>
                        )
                     ) : (
                        <div className="text-center">
                           <p className="text-gray-500 mb-2">{t("Checkout.noAddressSelected")}</p>
                           <Link href="/profile?tab=addresses" className="text-pink-600 hover:text-pink-700 text-sm font-medium">
                              {t("Checkout.addNewAddress")}
                           </Link>
                        </div>
                     )}
                  </div>
               </div>

               {/* Billing Address */}
               <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                     <h2 className="text-lg font-medium flex items-center">
                        <MapPin className="w-5 h-5 mr-2 text-pink-600" />
                        {t("Orders.billingAddress")}
                     </h2>
                     <button className="text-pink-600 text-sm font-medium" onClick={() => setShowBillingDropdown(!showBillingDropdown)}>
                        {t("Checkout.change")}
                        {showBillingDropdown ? <ChevronUp className="w-4 h-4 ml-1 inline" /> : <ChevronDown className="w-4 h-4 ml-1 inline" />}
                     </button>
                  </div>

                  {showBillingDropdown && user?.db?.addresses && user.db.addresses.length > 0 && (
                     <div className="mb-4 bg-gray-50 p-3 rounded-md border border-gray-100">
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                           {user?.db?.addresses.map((addr) => (
                              <button
                                 key={addr.id}
                                 className={`w-full text-left p-3 rounded-md border ${selectedBillingId === addr.id ? "border-pink-600 bg-pink-50" : "border-gray-200 hover:border-gray-300"}`}
                                 onClick={() => {
                                    setSelectedBillingId(addr.id);
                                    setShowBillingDropdown(false);
                                 }}
                              >
                                 {formatAddress(addr)}
                              </button>
                           ))}
                        </div>
                        <div className="mt-3 text-center">
                           <Link href="/profile?tab=addresses" className="text-pink-600 hover:text-pink-700 text-sm font-medium">
                              {t("Checkout.addNewAddress")}
                           </Link>
                        </div>
                     </div>
                  )}

                  <div className="border border-gray-100 rounded-md p-4">
                     {user?.db?.addresses && user.db.addresses.length > 0 ? (
                        getSelectedBillingAddress() ? (
                           formatAddress(getSelectedBillingAddress()!)
                        ) : (
                           <p className="text-gray-500">{t("Checkout.noAddressSelected")}</p>
                        )
                     ) : (
                        <div className="text-center">
                           <p className="text-gray-500 mb-2">{t("Checkout.noAddresses")}</p>
                           <Link href="/profile?tab=addresses" className="text-pink-600 hover:text-pink-700 text-sm font-medium">
                              {t("Checkout.addNewAddress")}
                           </Link>
                        </div>
                     )}
                  </div>
               </div>

               {/* Payment Method */}
               <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-medium mb-4">{t("Checkout.paymentMethod")}</h2>
                  <div className="space-y-3" role="radiogroup" aria-label={t("Checkout.paymentMethod")}>
                     {paymentMethods.map((method) => {
                        const selected = paymentMethod === method;
                        const [title, description] =
                           method === "cod"
                              ? [t("Checkout.paymentMethodRamburs"), t("Checkout.paymentMethodRambursDescription")]
                              : method === "stripe"
                                ? [t("Checkout.paymentMethodStripe"), t("Checkout.paymentMethodStripeDescription")]
                                : [t("Checkout.paymentMethodNetopia"), t("Checkout.paymentMethodNetopiaDescription")];
                        return (
                           <label key={method} className={`border rounded-md p-4 flex items-center cursor-pointer ${selected ? "border-pink-600 bg-pink-50" : "border-gray-200 hover:border-gray-300"}`}>
                              <input type="radio" name="paymentMethod" value={method} checked={selected} onChange={() => setPaymentMethod(method)} className="sr-only" />
                              {selected ? <CheckCircle className="w-5 h-5 text-pink-600 mr-3 shrink-0" /> : <Circle className="w-5 h-5 text-gray-300 mr-3 shrink-0" />}
                              <div>
                                 <p className="font-medium">{title}</p>
                                 <p className="text-gray-600 text-sm">{description}</p>
                              </div>
                           </label>
                        );
                     })}
                  </div>
               </div>

               {/* Voucher Code */}
               <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <h2 className="text-lg font-medium mb-4">{t("Checkout.voucherCode")}</h2>
                  {appliedVoucher ? (
                     <div className="flex items-center justify-between gap-4 rounded-md bg-green-50 text-green-800 px-4 py-3">
                        <span>
                           {t("Checkout.voucherApplied", { code: appliedVoucher.code })} <span className="font-medium">-{appliedVoucher.discount.toFixed(2)} Lei</span>
                        </span>
                        <button type="button" onClick={() => setAppliedVoucher(null)} className="text-sm underline">
                           {t("Checkout.removeVoucher")}
                        </button>
                     </div>
                  ) : (
                     <form
                        className="flex"
                        onSubmit={(e) => {
                           e.preventDefault();
                           applyVoucher(voucherCode);
                        }}
                     >
                        <input type="text" value={voucherCode} onChange={(e) => setVoucherCode(e.target.value)} placeholder={t("Checkout.voucherCodePlaceholder")} className="border border-pink-600 rounded-l-md px-4 py-2 flex-1 min-w-0 focus:outline-none uppercase" />
                        <button type="submit" disabled={!voucherCode.trim() || isCheckingVoucher} className="bg-pink-600 text-white px-4 py-2 rounded-r-md disabled:opacity-50">
                           {isCheckingVoucher ? <Loader2 className="w-4 h-4 animate-spin" /> : t("Checkout.apply")}
                        </button>
                     </form>
                  )}
                  {voucherError && <p className="mt-2 text-sm text-red-600">{voucherError}</p>}
               </div>
            </div>

            {/* Right column - Order summary */}
            <div className="lg:col-span-1">
               <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 sticky top-20">
                  <h2 className="text-lg font-medium mb-4">{t("Checkout.orderSummary")}</h2>

                  {/* Products */}
                  <div className="mb-6 space-y-4 ">
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

                  {/* Shipping */}
                  <div className="flex justify-between py-4 border-t border-gray-100">
                     <div className="flex items-center">
                        <Truck className="w-4 h-4 mr-2 text-gray-500" />
                        <span className="text-gray-700">{t("Orders.shipping")}</span>
                     </div>
                     {shipping && shipping.enable_threshold && subTotal >= shipping.free_shipping_threshold ? (
                        <div className="text-right">
                           <span className="font-medium line-through text-gray-400 text-sm mr-2">{shipping.default_price.toFixed(2)} Lei</span>
                           <span className="font-medium text-green-600">{t("Orders.free")}</span>
                        </div>
                     ) : (
                        <span className="font-medium">{shippingCost.toFixed(2)} Lei</span>
                     )}
                  </div>

                  {/* Free shipping threshold message */}
                  {shipping && shipping.enable_threshold && subTotal < shipping.free_shipping_threshold && (
                     <div className="py-2 px-3 bg-blue-50 border border-blue-100 rounded-md mb-4 text-sm">
                        <p>
                           {t("Checkout.addMore")} <span className="font-medium">{(shipping.free_shipping_threshold - subTotal).toFixed(2)} Lei</span> {t("Checkout.toGetFreeShipping")}
                        </p>
                     </div>
                  )}

                  {/* Voucher discount */}
                  {appliedVoucher && (
                     <div className="flex justify-between py-4 border-t border-gray-100 text-green-700">
                        <span>
                           {t("Checkout.voucherDiscount")} ({appliedVoucher.code})
                        </span>
                        <span className="font-medium">-{voucherDiscount.toFixed(2)} Lei</span>
                     </div>
                  )}

                  {/* Total */}
                  <div className="flex justify-between py-4 border-t border-gray-100">
                     <span className="font-medium">{t("Orders.total")}</span>
                     <span className="font-bold text-lg">{grandTotal.toFixed(2)} Lei</span>
                  </div>
                  <VatNote gross={grandTotal} className="-mt-2 mb-2" />

                  {/* Terms */}
                  <div className="mt-3 mb-6 text-xs text-gray-500">
                     <p>
                        {t("Checkout.toFinalizeOrder")}
                        <Link href="/terms" className="text-pink-600 hover:underline">
                           {t("Checkout.terms")}
                        </Link>{" "}
                        {t("Checkout.site")}.
                     </p>
                  </div>

                  {/* Submit */}
                  <button
                     onClick={handlePlaceOrder}
                     disabled={
                        isProcessing ||
                        !selectedShippingId ||
                        !selectedBillingId ||
                        !cart.length ||
                        user.emailVerified === false ||
                        (isBusinessOrder && (!getSelectedBillingAddress()?.business || !getSelectedBillingAddress()?.business_details?.cui || !getSelectedBillingAddress()?.business_details?.name || !getSelectedBillingAddress()?.business_details?.reg_no))
                     }
                     className={`w-full py-3 px-4 rounded-md font-medium text-white ${
                        isProcessing ||
                        !selectedShippingId ||
                        !selectedBillingId ||
                        !cart.length ||
                        user.emailVerified === false ||
                        (isBusinessOrder && (!getSelectedBillingAddress()?.business || !getSelectedBillingAddress()?.business_details?.cui || !getSelectedBillingAddress()?.business_details?.name || !getSelectedBillingAddress()?.business_details?.reg_no))
                           ? "bg-gray-400 cursor-not-allowed"
                           : "bg-pink-600 hover:bg-pink-700"
                     }`}
                  >
                     {isProcessing ? (
                        <span className="flex items-center justify-center">
                           <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                           {t("Checkout.processing")}
                        </span>
                     ) : user.emailVerified === false ? (
                        t("Checkout.verifyEmailToContinue")
                     ) : paymentMethod === "cod" ? (
                        t("Checkout.placeOrder")
                     ) : (
                        t("Checkout.continueToPayment")
                     )}
                  </button>
               </div>
            </div>
         </div>
      </div>
   );
}
