"use client";
import React, { useEffect } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Phone, Mail, MapPin, Instagram, Facebook, Twitter } from "lucide-react";
import Link from "next/link";
import { getInfoData } from "@/queries";
import { Info } from "@/types/user";
import { useTranslations } from "next-intl";
import { sendContactMessage } from "@/lib/contact";
import { storeErrorOf, useStoreErrorMessage } from "@/components/common/useStoreError";
import { validateEmail, validatePhone } from "@core/validators";
interface FormData {
   first_name: string;
   last_name: string;
   phone: string;
   email: string;
   message: string;
   website?: string;
}

// components/Contact.tsx

const Contact = () => {
   const {
      register,
      handleSubmit,
      reset,
      formState: { errors, isSubmitting },
   } = useForm<FormData>();

   const t = useTranslations("Contact");
   const storeErrorMessage = useStoreErrorMessage();
   const [successMessage, setSuccessMessage] = useState<string | null>(null);
   const [errorMessage, setErrorMessage] = useState<string | null>(null);
   const [info, setInfo] = useState<Info | null>(null);

   useEffect(() => {
      const fetchInfo = async () => {
         const info = await getInfoData();
         setInfo(info);
      };
      fetchInfo();
   }, []);

   const onSubmit = async (data: FormData) => {
      setSuccessMessage(null);
      setErrorMessage(null);
      try {
         await sendContactMessage({ type: "contact", ...data });
         setSuccessMessage(t("contactFormSuccess"));
         reset();
      } catch (error) {
         console.error("Failed to send message", error);
         const storeError = storeErrorOf(error);
         setErrorMessage(storeError ? storeErrorMessage(storeError.code, storeError.params) : t("contactFormError"));
      }
   };
   return (
      <div className="main main-contact py-12 px-4 md:px-12">
         {/* Headline Section */}
         <div className="headline-contact text-center mb-12">
            <h1 className="text-4xl font-semibold text-gray-800">{t("contactTitle")}</h1>
            <p className="text-lg text-gray-500 mt-2">
               {t("contactDescription")}
            </p>
         </div>

         <div className="contact container mx-auto flex flex-col lg:flex-row lg:justify-around gap-16">
            {/* Contact Info */}
            <div className="contact-info w-full lg:w-1/3 flex flex-col">
               <div className="info-contc ">
                  <h3 className="hidden">{t("contactInfo")}</h3>
                  {info?.phone_no && (
                     <a href={`tel:${info.phone_no}`} className="flex items-center gap-4 mb-4 text-gray-700">
                        <Phone className="size-6" />
                        <span>{info.phone_no}</span>
                     </a>
                  )}
                  {info?.contact_mail && (
                     <a href={`mailto:${info.contact_mail}`} className="flex items-center gap-4 mb-4 text-gray-700">
                        <Mail className="size-6" />
                        <span>{info.contact_mail}</span>
                     </a>
                  )}
                  {info?.store_address && (
                     <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(info.store_address)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 text-gray-700">
                        <MapPin className="size-6" />
                        <span>{info.store_address}</span>
                     </a>
                  )}
               </div>
               <div className="social-info mt-8">
                  <h3 className="text-lg font-semibold mb-4">{t("contactSocialAccounts")}</h3>
                  <div className="flex gap-6">
                     {info?.instagram_link && (
                        <Link href={info.instagram_link} target="_blank" rel="noopener noreferrer">
                           <Instagram className="size-4" />
                        </Link>
                     )}
                     {info?.facebook_link && (
                        <Link href={info.facebook_link} target="_blank" rel="noopener noreferrer">
                           <Facebook className="size-4" />
                        </Link>
                     )}
                     {info?.x_link && (
                        <Link href={info.x_link} target="_blank" rel="noopener noreferrer">
                           <Twitter className="size-4" />
                        </Link>
                     )}
                  </div>
               </div>
               {/* Map of the store address */}
               {info?.store_address && (
                  <div id="map" className="w-full mt-8">
                     <iframe
                        id="google-maps"
                        title={info.store_address}
                        src={`https://www.google.com/maps?q=${encodeURIComponent(info.store_address)}&output=embed`}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        className="w-full h-64 rounded-lg"
                     ></iframe>
                  </div>
               )}
            </div>
            {/* Contact Form */}
            <div className="contact-form   ">
               {successMessage && (
                  <p className="text-green-600 text-center mb-4">{successMessage}</p>
               )}
               {errorMessage && <p className="text-red-600 text-center mb-4">{errorMessage}</p>}
               <form onSubmit={handleSubmit(onSubmit)} className=" flex flex-col w-full gap-4">
                  {/* Name */}
                  <div className="flex flex-col gap-4 md:flex-row w-full">
                     <div className="flex flex-col gap-2 w-full">
                        <label className="text-sm text-gray-700">{t("contactFormName")}</label>
                        <input
                           type="text"
                           {...register("last_name", {
                              required: t("contactFormNameRequired"),
                           })}
                           className="ring-2 ring-gray-300 rounded-md p-2 placeholder:text-sm"
                           placeholder={t("contactFormNamePlaceholder")}
                        />
                        {errors.last_name && (
                           <p className="text-red-500 text-sm">{errors.last_name.message}</p>
                        )}
                     </div>
                     <div className="flex flex-col gap-2 w-full">
                        <label className="text-sm text-gray-700">{t("contactFormFirstName")}</label>
                        <input
                           type="text"
                           {...register("first_name", { required: t("contactFormFirstNameRequired") })}
                           className="ring-2 ring-gray-300 rounded-md p-2 placeholder:text-sm"
                           placeholder={t("contactFormFirstNamePlaceholder")}
                        />
                        {errors.first_name && (
                           <p className="text-red-500 text-sm">{errors.first_name.message}</p>
                        )}
                     </div>
                  </div>
                  <div className="flex flex-col gap-4 md:flex-row  w-full">
                     {/* Email */}
                     <div className=" flex flex-col gap-2 w-full">
                        <label className="text-sm text-gray-700">{t("contactFormEmail")}</label>
                        <input
                           type="email"
                           {...register("email", {
                              required: t("contactFormEmailRequired"),
                              validate: (value) => validateEmail(value) || t("contactFormEmailInvalid"),
                           })}
                           className="ring-2 ring-gray-300 rounded-md p-2 placeholder:text-sm"
                           placeholder={t("contactFormEmailPlaceholder")}
                        />
                        {errors.email && (
                           <p className="text-red-500 text-sm">{errors.email.message}</p>
                        )}
                     </div>

                     {/* Phone */}
                     <div className="flex flex-col gap-2 w-full">
                        <label className="text-sm text-gray-700">{t("contactFormPhone")}</label>
                        <input
                           type="text"
                           {...register("phone", {
                              required: t("contactFormPhoneRequired"),
                              validate: (value) => !value || validatePhone(value) || t("contactFormPhoneInvalid"),
                           })}
                           className="ring-2 ring-gray-300 rounded-md p-2 placeholder:text-sm"
                           placeholder={t("contactFormPhonePlaceholder")}
                        />
                        {errors.phone && (
                           <p className="text-red-500 text-sm">{errors.phone.message}</p>
                        )}
                     </div>
                  </div>
                  {/* Message */}
                  <div className="flex flex-col gap-2">
                     <label className="text-sm text-gray-700">{t("contactFormMessage")}</label>
                     <textarea
                        {...register("message", { required: t("contactFormMessageRequired") })}
                        className="ring-2 ring-gray-300 rounded-md p-2 placeholder:text-sm w-full"
                        placeholder={t("contactFormMessagePlaceholder")}
                        rows={4}
                     ></textarea>
                     {errors.message && (
                        <p className="text-red-500 text-sm">{errors.message.message}</p>
                     )}
                  </div>

                  {/* Left empty by people; bots that fill in every field are ignored */}
                  <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" {...register("website")} />

                  {/* Submit Button */}
                  <button
                     type="submit"
                     className="bg-black text-white p-2 rounded-md disabled:bg-brand-200 disabled:cursor-not-allowed w-2/4 self-center"
                     disabled={isSubmitting}
                  >
                     {isSubmitting ? t("contactFormSubmitLoading") : t("contactFormSubmit")}
                  </button>
               </form>
            </div>
         </div>
      </div>
   );
};

export default Contact;
