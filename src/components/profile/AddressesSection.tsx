"use client";

import { useState, useEffect } from "react";
import { Plus, Trash, Building } from "lucide-react";
import { doc, updateDoc, collection, addDoc, deleteDoc, deleteField } from "firebase/firestore";
import { db } from "@/lib/firebaseInit";
import { Address, BusinessDetails } from "@/types/user";
import { useAuthContext } from "@/context/AuthContext";
import { useTranslations } from "next-intl";

// Custom checkbox styles
const customCheckboxStyles = `
   appearance-none
   w-4 h-4
   border border-gray-300
   rounded
   checked:bg-pink-700
   checked:border-pink-700
   checked:hover:bg-pink-700
   hover:border-gray-400
   transition-colors
   cursor-pointer
   relative

   after:content-['']
   after:w-[6px]
   after:h-[8px]
   after:border-white
   after:border-b-2
   after:border-r-2
   after:absolute
   after:top-[2px]
   after:left-[4px]
   after:opacity-0
   after:rotate-45
   checked:after:opacity-100
`;

const AddressesSection = () => {
   const { user } = useAuthContext();
   const t = useTranslations("Addresses");

   // Track default addresses in local state to update UI immediately
   const [defaultShippingId, setDefaultShippingId] = useState<string | null>(null);
   const [defaultBillingId, setDefaultBillingId] = useState<string | null>(null);

   // Initialize local state from user data when it loads
   useEffect(() => {
      if (user?.db) {
         setDefaultShippingId(user.db.shipping_address_id || null);
         setDefaultBillingId(user.db.billing_address_id || null);
      }
   }, [user]);

   const [addingAddress, setAddingAddress] = useState(false);
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [isBusinessAddress, setIsBusinessAddress] = useState(false);
   const [isEditing, setIsEditing] = useState(false);
   const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
   const [newAddress, setNewAddress] = useState<Partial<Address>>({
      city: "",
      county: "",
      postal_code: 0,
      street: "",
      street_no: 0,
      apartment: "",
      building: "",
      building_no: "",
      floor: 0,
      intercom: "",
      details: "",
      business: false,
   });
   const [newBusinessDetails, setNewBusinessDetails] = useState<Partial<BusinessDetails> | null>(null);

   // Form validation
   const [errors, setErrors] = useState({
      city: "",
      county: "",
      postal_code: "",
      street: "",
      street_no: "",
      business_name: "",
      business_cui: "",
      business_reg_no: "",
   });

   // Reset form function
   const resetForm = () => {
      setNewAddress({
         city: "",
         county: "",
         postal_code: 0,
         street: "",
         street_no: 0,
         apartment: "",
         building: "",
         building_no: "",
         floor: 0,
         intercom: "",
         details: "",
         business: false,
      });
      setNewBusinessDetails(null);
      setIsBusinessAddress(false);
      setIsEditing(false);
      setEditingAddressId(null);
      setErrors({
         city: "",
         county: "",
         postal_code: "",
         street: "",
         street_no: "",
         business_name: "",
         business_cui: "",
         business_reg_no: "",
      });
   };

   // Start editing an address
   const startEditingAddress = (address: Address) => {
      setIsEditing(true);
      setEditingAddressId(address.id);
      setIsBusinessAddress(!!address.business);
      setNewAddress({
         city: address.city,
         county: address.county,
         postal_code: address.postal_code,
         street: address.street,
         street_no: address.street_no,
         apartment: address.apartment || "",
         building: address.building || "",
         building_no: address.building_no || "",
         floor: address.floor || 0,
         intercom: address.intercom || "",
         details: address.details || "",
         business: !!address.business,
      });
      setNewBusinessDetails({
         name: address.business_details?.name || "",
         cui: address.business_details?.cui || "",
         reg_no: address.business_details?.reg_no || "",
         bank: address.business_details?.bank || "",
         iban: address.business_details?.iban || "",
      });
      setAddingAddress(true);
   };

   // Cancel form
   const cancelForm = () => {
      resetForm();
      setAddingAddress(false);
   };

   const validateAddressForm = () => {
      const newErrors = {
         city: "",
         county: "",
         postal_code: "",
         street: "",
         street_no: "",
         business_name: "",
         business_cui: "",
         business_reg_no: "",
      };

      let isValid = true;

      // Validate city
      if (!newAddress.city?.trim()) {
         newErrors.city = t("cityRequired");
         isValid = false;
      }

      // Validate county
      if (!newAddress.county?.trim()) {
         newErrors.county = t("countyRequired");
         isValid = false;
      }

      // Validate postal code
      if (!newAddress.postal_code) {
         newErrors.postal_code = t("postalCodeRequired");
         isValid = false;
      } else if (newAddress.postal_code.toString().length < 5) {
         newErrors.postal_code = t("postalCodeInvalid");
         isValid = false;
      }

      // Validate street
      if (!newAddress.street?.trim()) {
         newErrors.street = t("streetRequired");
         isValid = false;
      }

      // Validate street number
      if (!newAddress.street_no) {
         newErrors.street_no = t("streetNoRequired");
         isValid = false;
      }

      // Validate business details if it's a business address
      if (isBusinessAddress) {
         // Validate business name
         if (!newBusinessDetails?.name?.trim()) {
            newErrors.business_name = t("businessNameRequired");
            isValid = false;
         }

         // Validate CUI/CIF
         if (!newBusinessDetails?.cui?.trim()) {
            newErrors.business_cui = t("businessCuiRequired");
            isValid = false;
         } else {
            // CUI validation - should be numeric and at least 6 digits
            const cuiRegex = /^(RO)?[0-9]{6,10}$/;
            if (!cuiRegex.test(newBusinessDetails.cui.replace(/\s/g, ""))) {
               newErrors.business_cui = t("businessCuiInvalid");
               isValid = false;
            }
         }

         // Validate registration number
         if (!newBusinessDetails?.reg_no?.trim()) {
            newErrors.business_reg_no = t("businessRegNoRequired");
            isValid = false;
         } else {
            // Registration number validation - format like J12/123/2020
            const regNoRegex = /^[JFCB][0-9]{1,2}\/[0-9]{1,6}\/[0-9]{4}$/;
            if (!regNoRegex.test(newBusinessDetails.reg_no.replace(/\s/g, ""))) {
               newErrors.business_reg_no = t("businessRegNoInvalid");
               isValid = false;
            }
         }
      }

      setErrors(newErrors);
      return isValid;
   };

   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;

      // Handle numeric fields
      if (name === "postal_code" || name === "street_no" || name === "floor") {
         setNewAddress({
            ...newAddress,
            [name]: value ? parseInt(value) : 0,
         });
      }
      // Handle business details fields
      else if (name.startsWith("business_")) {
         const businessField = name.replace("business_", "");
         setNewBusinessDetails({
            ...newBusinessDetails,
            [businessField]: value,
         });
      } else {
         setNewAddress({
            ...newAddress,
            [name]: value,
         });
      }

      // Clear error when user starts typing
      if (errors[name as keyof typeof errors]) {
         setErrors({ ...errors, [name]: "" });
      }
   };

   const handleBusinessToggle = (checked: boolean) => {
      setIsBusinessAddress(checked);
      setNewAddress({
         ...newAddress,
         business: checked,
      });
   };

   // Properly typed helper function
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   const cleanEmptyFields = <T extends Record<string, any>>(obj: T): Partial<T> => {
      const cleanedObj: Partial<T> = {};

      Object.entries(obj).forEach(([key, value]) => {
         // Skip empty strings, null, undefined, or zero values for numeric fields
         if (value === null || value === undefined) return;
         if (typeof value === "string" && value.trim() === "") return;
         if (typeof value === "number" && value === 0 && key !== "floor" && key !== "street_no") return;

         // Recursively clean nested objects (like business_details)
         if (value !== null && typeof value === "object" && !Array.isArray(value)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cleanedNested = cleanEmptyFields(value as Record<string, any>);
            if (Object.keys(cleanedNested).length > 0) {
               // eslint-disable-next-line @typescript-eslint/no-explicit-any
               (cleanedObj as any)[key] = cleanedNested;
            }
         } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (cleanedObj as any)[key] = value;
         }
      });

      return cleanedObj;
   };

   const addNewAddress = async () => {
      if (!validateAddressForm() || !user) {
         return;
      }

      setIsSubmitting(true);
      try {
         // First check if we have all required business details when it's a business address
         let businessDetails = null;
         if (isBusinessAddress && newBusinessDetails?.name?.trim() && newBusinessDetails?.cui?.trim() && newBusinessDetails?.reg_no?.trim()) {
            businessDetails = {
               name: newBusinessDetails.name,
               cui: newBusinessDetails.cui,
               reg_no: newBusinessDetails.reg_no,
               ...(newBusinessDetails.bank ? { bank: newBusinessDetails.bank } : {}),
               ...(newBusinessDetails.iban ? { iban: newBusinessDetails.iban } : {}),
            };
         }

         if (isEditing && editingAddressId) {
            // Update existing address - clean the data first
            const addressToUpdate = {
               city: newAddress.city,
               county: newAddress.county,
               postal_code: newAddress.postal_code,
               street: newAddress.street,
               street_no: newAddress.street_no,
               ...(newAddress.apartment ? { apartment: newAddress.apartment } : {}),
               ...(newAddress.building ? { building: newAddress.building } : {}),
               ...(newAddress.building_no ? { building_no: newAddress.building_no } : {}),
               ...(newAddress.floor ? { floor: newAddress.floor } : {}),
               ...(newAddress.intercom ? { intercom: newAddress.intercom } : {}),
               ...(newAddress.details ? { details: newAddress.details } : {}),
               business: isBusinessAddress,
               ...(isBusinessAddress && businessDetails && { business_details: businessDetails }),
            };

            // Clean out empty fields before saving
            const cleanedAddress = cleanEmptyFields(addressToUpdate);

            await updateDoc(doc(db, "Users", user.uid, "Addresses", editingAddressId), cleanedAddress);
         } else {
            // Add new address - clean the data first
            const newAddressData = {
               city: newAddress.city,
               county: newAddress.county,
               postal_code: newAddress.postal_code,
               street: newAddress.street,
               street_no: newAddress.street_no,
               ...(newAddress.apartment ? { apartment: newAddress.apartment } : {}),
               ...(newAddress.building ? { building: newAddress.building } : {}),
               ...(newAddress.building_no ? { building_no: newAddress.building_no } : {}),
               ...(newAddress.floor ? { floor: newAddress.floor } : {}),
               ...(newAddress.intercom ? { intercom: newAddress.intercom } : {}),
               ...(newAddress.details ? { details: newAddress.details } : {}),
               business: isBusinessAddress,
               ...(isBusinessAddress && businessDetails && { business_details: businessDetails }),
            };

            // Clean out empty fields before saving
            const cleanedAddress = cleanEmptyFields(newAddressData);

            const addressesCollection = collection(db, "Users", user.uid, "Addresses");
            await addDoc(addressesCollection, cleanedAddress);
         }

         setAddingAddress(false);
         resetForm();
      } catch (err) {
         console.error(err);
      } finally {
         setIsSubmitting(false);
      }
   };

   const setAddressAsDefault = async (addressId: string, type: "shipping" | "billing") => {
      if (!user) return;

      try {
         // Update local state immediately for responsive UI
         if (type === "shipping") {
            // If this address was already default, toggle it off
            if (defaultShippingId === addressId) {
               setDefaultShippingId(null);
               await updateDoc(doc(db, "Users", user.uid), {
                  shipping_address_id: deleteField(),
               });
            } else {
               // Otherwise, set it as default
               setDefaultShippingId(addressId);
               await updateDoc(doc(db, "Users", user.uid), {
                  shipping_address_id: addressId,
               });
            }
         } else {
            // If this address was already default, toggle it off
            if (defaultBillingId === addressId) {
               setDefaultBillingId(null);
               await updateDoc(doc(db, "Users", user.uid), {
                  billing_address_id: deleteField(),
               });
            } else {
               // Otherwise, set it as default
               setDefaultBillingId(addressId);
               await updateDoc(doc(db, "Users", user.uid), {
                  billing_address_id: addressId,
               });
            }
         }
      } catch (err) {
         console.error(err);
         // Revert local state if the update fails
         if (type === "shipping" && user?.db?.shipping_address_id) {
            setDefaultShippingId(user.db?.shipping_address_id);
         } else if (type === "billing" && user?.db?.billing_address_id) {
            setDefaultBillingId(user.db?.billing_address_id);
         }
      }
   };

   const removeAddress = async (addressId: string) => {
      if (!user) return;

      try {
         // Delete the address document from the Addresses subcollection
         await deleteDoc(doc(db, "Users", user.uid, "Addresses", addressId));

         // If this was a default address, clear that setting
         if (defaultShippingId === addressId) {
            setDefaultShippingId(null);
            await updateDoc(doc(db, "Users", user.uid), {
               shipping_address_id: deleteField(),
            });
         }

         if (defaultBillingId === addressId) {
            setDefaultBillingId(null);
            await updateDoc(doc(db, "Users", user.uid), {
               billing_address_id: deleteField(),
            });
         }
      } catch (err) {
         console.error(err);
      }
   };

   // If user is null, show a loading state or a message
   if (!user) {
      return (
         <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-100">
            <div className="text-center py-8 text-gray-500">
               <p>{t("loadingAddresses")}</p>
            </div>
         </div>
      );
   }

   return (
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-100">
         <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-medium">{t("myAddresses")}</h2>
            <button onClick={() => setAddingAddress(true)} className="flex items-center justify-center gap-2 text-sm bg-black text-white px-4 py-2 rounded-md hover:bg-opacity-90 transition-colors w-full sm:w-auto">
               <Plus size={16} /> {t("addAddress")}
            </button>
         </div>

         {addingAddress && (
            <div className="mb-8 border border-gray-200 rounded-lg p-4">
               <h3 className="text-lg font-medium mb-4">{isEditing ? t("editAddress") : t("addAddress")}</h3>

               {/* Regular address fields */}
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                     <label className="block text-sm text-gray-700 mb-1">{t("city")} *</label>
                     <input type="text" name="city" value={newAddress.city || ""} onChange={handleInputChange} className={`w-full p-2 border ${errors.city ? "border-red-500" : "border-gray-300"} rounded-md`} />
                     {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                  </div>
                  <div>
                     <label className="block text-sm text-gray-700 mb-1">{t("county")} *</label>
                     <input type="text" name="county" value={newAddress.county || ""} onChange={handleInputChange} className={`w-full p-2 border ${errors.county ? "border-red-500" : "border-gray-300"} rounded-md`} />
                     {errors.county && <p className="text-red-500 text-xs mt-1">{errors.county}</p>}
                  </div>
                  <div>
                     <label className="block text-sm text-gray-700 mb-1">{t("street")} *</label>
                     <input type="text" name="street" value={newAddress.street || ""} onChange={handleInputChange} className={`w-full p-2 border ${errors.street ? "border-red-500" : "border-gray-300"} rounded-md`} />
                     {errors.street && <p className="text-red-500 text-xs mt-1">{errors.street}</p>}
                  </div>
                  <div>
                     <label className="block text-sm text-gray-700 mb-1">{t("streetNo")} *</label>
                     <input type="number" name="street_no" value={newAddress.street_no || ""} onChange={handleInputChange} className={`w-full p-2 border ${errors.street_no ? "border-red-500" : "border-gray-300"} rounded-md`} />
                     {errors.street_no && <p className="text-red-500 text-xs mt-1">{errors.street_no}</p>}
                  </div>
                  <div>
                     <label className="block text-sm text-gray-700 mb-1">{t("postalCode")} *</label>
                     <input type="number" name="postal_code" value={newAddress.postal_code || ""} onChange={handleInputChange} className={`w-full p-2 border ${errors.postal_code ? "border-red-500" : "border-gray-300"} rounded-md`} />
                     {errors.postal_code && <p className="text-red-500 text-xs mt-1">{errors.postal_code}</p>}
                  </div>
                  <div>
                     <label className="block text-sm text-gray-700 mb-1">{t("building")}</label>
                     <input type="text" name="building" value={newAddress.building || ""} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                     <label className="block text-sm text-gray-700 mb-1">{t("buildingNo")}</label>
                     <input type="text" name="building_no" value={newAddress.building_no || ""} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                     <label className="block text-sm text-gray-700 mb-1">{t("apartment")}</label>
                     <input type="text" name="apartment" value={newAddress.apartment || ""} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                     <label className="block text-sm text-gray-700 mb-1">{t("floor")}</label>
                     <input type="number" name="floor" value={newAddress.floor || ""} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                     <label className="block text-sm text-gray-700 mb-1">{t("intercom")}</label>
                     <input type="text" name="intercom" value={newAddress.intercom || ""} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-md" />
                  </div>
                  <div className="sm:col-span-2">
                     <label className="block text-sm text-gray-700 mb-1">{t("moreDetails")}</label>
                     <textarea name="details" value={newAddress.details || ""} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-md" rows={2}></textarea>
                  </div>
               </div>

               {/* Business Address Toggle */}
               <div className="mt-6 border-t border-gray-200 pt-4">
                  <label className="flex items-center gap-2 mb-4">
                     <input type="checkbox" checked={isBusinessAddress} onChange={(e) => handleBusinessToggle(e.target.checked)} className={customCheckboxStyles} />
                     <span className="font-medium flex items-center">
                        <Building size={16} className="mr-2 text-gray-600" />
                        {t("businessAddress")}
                     </span>
                  </label>

                  {/* Business Details Fields */}
                  {isBusinessAddress && (
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 mb-2 bg-gray-50 p-4 rounded-md">
                        <div>
                           <label className="block text-sm text-gray-700 mb-1">{t("businessName")} *</label>
                           <input type="text" name="business_name" value={newAddress.business_details?.name || ""} onChange={handleInputChange} className={`w-full p-2 border ${errors.business_name ? "border-red-500" : "border-gray-300"} rounded-md`} placeholder={t("businessNamePlaceholder")} />
                           {errors.business_name && <p className="text-red-500 text-xs mt-1">{errors.business_name}</p>}
                        </div>
                        <div>
                           <label className="block text-sm text-gray-700 mb-1">{t("businessCui")} *</label>
                           <input type="text" name="business_cui" value={newAddress.business_details?.cui || ""} onChange={handleInputChange} className={`w-full p-2 border ${errors.business_cui ? "border-red-500" : "border-gray-300"} rounded-md`} placeholder={t("businessCuiPlaceholder")} />
                           {errors.business_cui && <p className="text-red-500 text-xs mt-1">{errors.business_cui}</p>}
                        </div>
                        <div>
                           <label className="block text-sm text-gray-700 mb-1">{t("businessRegNo")} *</label>
                           <input type="text" name="business_reg_no" value={newAddress.business_details?.reg_no || ""} onChange={handleInputChange} className={`w-full p-2 border ${errors.business_reg_no ? "border-red-500" : "border-gray-300"} rounded-md`} placeholder={t("businessRegNoPlaceholder")} />
                           {errors.business_reg_no && <p className="text-red-500 text-xs mt-1">{errors.business_reg_no}</p>}
                        </div>
                        <div>
                           <label className="block text-sm text-gray-700 mb-1">{t("businessBank")}</label>
                           <input type="text" name="business_bank" value={newAddress.business_details?.bank || ""} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded-md" />
                        </div>
                        <div>
                           <label className="block text-sm text-gray-700 mb-1">{t("businessIban")}</label>
                           <input type="text" name="business_iban" value={newAddress.business_details?.iban || ""} onChange={handleInputChange} className={`w-full p-2 border border-gray-300 rounded-md`} placeholder="Ex: RO49AAAA1B31007593840000" />
                        </div>
                     </div>
                  )}
               </div>

               <div className="flex flex-col sm:flex-row sm:justify-end gap-2 mt-4">
                  <button onClick={cancelForm} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 order-2 sm:order-1">
                     {t("cancel")}
                  </button>
                  <button onClick={addNewAddress} disabled={isSubmitting} className="bg-black text-white px-4 py-2 rounded-md hover:bg-opacity-90 order-1 sm:order-2 disabled:bg-gray-400 disabled:cursor-not-allowed">
                     {isSubmitting ? t("saving") : isEditing ? t("updateAddress") : t("saveAddress")}
                  </button>
               </div>
            </div>
         )}

         <div className="space-y-6">
            {user.db?.addresses && user.db.addresses.length > 0 ? (
               user.db.addresses.map((address) => (
                  <div key={address.id} className={`border ${address.business ? "border-pink-200 bg-pink-50" : "border-gray-200"} rounded-lg p-4 hover:border-gray-300 transition-colors`}>
                     <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                        <div>
                           {address.business && (
                              <div className="flex items-center mb-2 text-pink-700">
                                 <Building size={16} className="mr-1" />
                                 <span className="text-sm font-medium">{address.business_details?.name}</span>
                              </div>
                           )}
                           <p className="font-medium">
                              {t("streetShort")} {address.street} {t("streetNoShort")} {address.street_no}
                              {address.building && `, ${t("building")} ${address.building}`}
                              {address.building_no && `, ${t("buildingNoShort")} ${address.building_no}`}
                              {address.apartment && `, ${t("apartment")} ${address.apartment}`}
                              {address.floor ? `, ${t("floor")} ${address.floor}` : ""}
                           </p>
                           <p className="text-gray-600">
                              {t("cityShort")} {address.city}, {t("countyShort")} {address.county}, {t("postalCode")} {address.postal_code}
                           </p>
                           {address.details && <p className="text-gray-500 text-sm mt-1">{address.details}</p>}

                           {address.business && address.business_details && (
                              <div className="mt-2 text-xs text-gray-600">
                                 <p>{t("businessName")}: {address.business_details.name}</p>
                                 <p>{t("businessCui")}: {address.business_details.cui}</p>
                                 <p>{t("businessRegNo")}: {address.business_details.reg_no}</p>
                                 {address.business_details.bank && <p>{t("businessBank")}: {address.business_details.bank}</p>}
                                 {address.business_details.iban && <p>{t("businessIban")}: {address.business_details.iban}</p>}
                              </div>
                           )}
                        </div>
                        <div className="flex gap-2 self-end sm:self-start">
                           <button onClick={() => startEditingAddress(address)} className="text-blue-500 hover:text-blue-700 p-1" title={t("editAddress")}>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                 <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
                              </svg>
                           </button>
                           <button onClick={() => removeAddress(address.id)} className="text-red-500 hover:text-red-700 p-1" title={t("deleteAddress")}>
                              <Trash size={18} />
                           </button>
                        </div>
                     </div>

                     <div className="flex flex-col sm:flex-row mt-4 gap-4">
                        <div>
                           <label className="flex items-center gap-2 text-sm">
                              <input type="checkbox" checked={defaultShippingId === address.id} onChange={() => setAddressAsDefault(address.id, "shipping")} className={customCheckboxStyles} />
                              {t("shippingAddress")}
                           </label>
                        </div>
                        <div>
                           <label className="flex items-center gap-2 text-sm">
                              <input type="checkbox" checked={defaultBillingId === address.id} onChange={() => setAddressAsDefault(address.id, "billing")} className={customCheckboxStyles} />
                              {t("billingAddress")}
                           </label>
                        </div>
                     </div>
                  </div>
               ))
            ) : (
               <div className="text-center py-8 text-gray-500">
                  <p>{t("noAddressSaved")}</p>
                  <p className="text-sm mt-2">{t("addAddressDescription")}</p>
               </div>
            )}
         </div>
      </div>
   );
};

export default AddressesSection;
