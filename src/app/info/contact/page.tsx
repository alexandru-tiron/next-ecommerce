"use client";
import React, { useEffect } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Phone, Mail, MapPin, Instagram, Facebook, Twitter } from "lucide-react";
import Link from "next/link";
import { getInfoData } from "@/queries";
import { Info } from "@/types/user";
import { useTranslations } from "next-intl";
interface FormData {
   first_name: string;
   last_name: string;
   phone: string;
   email: string;
   message: string;
}

// components/Contact.tsx

const Contact = () => {
   const {
      register,
      handleSubmit,
      formState: { errors, isSubmitting },
   } = useForm<FormData>();

   const t = useTranslations("Contact");
   const [successMessage, setSuccessMessage] = useState<string | null>(null);
   const [info, setInfo] = useState<Info | null>(null);

   useEffect(() => {
      const fetchInfo = async () => {
         const info = await getInfoData();
         setInfo(info);
      };
      fetchInfo();
   }, []);

   const onSubmit = async (data: FormData) => {
      console.log("Form Data:", data); // Log the submitted form data

      try {
         // Simulate an API call (replace with real API endpoint)
         await new Promise((resolve) => setTimeout(resolve, 1000));
         setSuccessMessage(t("contactFormSuccess"));
      } catch (error) {
         console.error(t("contactFormError"), error);
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
                  <a href={`tel:${info?.phone_no}`} className="flex items-center gap-4 mb-4 text-gray-700">
                     <Phone className="size-6" />
                     <span>{info?.phone_no}</span>
                  </a>
                  <a href={`mailto:${info?.contact_mail}`} className="flex items-center gap-4 mb-4 text-gray-700">
                     <Mail className="size-6" />
                     <span>{info?.contact_mail}</span>
                  </a>
                  <a
                     href="https://maps.app.goo.gl/WZKoCNVHFeuJPdXx9"
                     target="_blank"
                     rel="noopener noreferrer"
                     className="flex items-center gap-4 text-gray-700"
                  >
                     <MapPin className="size-6" />
                     <span>{info?.store_address}</span>
                  </a>
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
               {/* Map */}
               <div id="map" className="w-full mt-8">
                  <iframe
                     id="google-maps"
                     title="maps"
                     src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2800.2879045381173!2d28.020687017013735!3d45.42369272759964!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40b6dfce24b54d87%3A0x3f895b93d0333a6c!2sHouse%20of%20Hair-Luxury%20Brand!5e0!3m2!1sro!2sro!4v1739366413055!5m2!1sro!2sro"
                     allowFullScreen
                     loading="lazy"
                     referrerPolicy="no-referrer-when-downgrade"
                     className="w-full h-64 rounded-lg"
                  ></iframe>
               </div>
            </div>
            {/* Contact Form */}
            <div className="contact-form   ">
               {successMessage && (
                  <p className="text-green-600 text-center mb-4">{successMessage}</p>
               )}
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
                              pattern: {
                                 value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/,
                                 message: t("contactFormEmailInvalid"),
                              },
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
                              pattern: {
                                 value: /^\+?[1-9]\d{1,14}$/,
                                 message: t("contactFormPhoneInvalid"),
                              },
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

                  {/* Submit Button */}
                  <button
                     type="submit"
                     className="bg-black text-white p-2 rounded-md disabled:bg-pink-200 disabled:cursor-not-allowed w-2/4 self-center"
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
