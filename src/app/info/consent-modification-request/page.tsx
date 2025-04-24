"use client";
import React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
interface FormData {
   first_name: string;
   last_name: string;
   phone: string;
   email: string;
   message: string;
}

const Contact = () => {
   const {
      register,
      handleSubmit,
      formState: { errors, isSubmitting },
   } = useForm<FormData>();

   const t = useTranslations("ConsentModificationRequest");
   const [successMessage, setSuccessMessage] = useState<string | null>(null);

   const onSubmit = async (data: FormData) => {
      console.log("Form Data:", data); // Log the submitted form data

      try {
         // Simulate an API call (replace with real API endpoint)
         await new Promise((resolve) => setTimeout(resolve, 1000));
         setSuccessMessage("Message sent successfully!");
      } catch (error) {
         console.error("Failed to send message", error);
      }
   };
   return (
      <div className="main main-contact py-12 px-4 md:px-12">
         {/* Headline Section */}
         <div className="headline-contact text-center mb-12">
            <h1 className="text-4xl font-semibold text-gray-800">
               {t("consentModificationRequest")}
            </h1>
            <p className="text-lg text-gray-500 mt-2">
               {t("consentModificationRequestDescription")}
            </p>
         </div>

         <div className="contact container mx-auto flex flex-col lg:flex-row lg:justify-around gap-16">
            {/* Contact Form */}
            <div className="contact-form   ">
               {successMessage && (
                  <p className="text-green-600 text-center mb-4">{successMessage}</p>
               )}
               <form onSubmit={handleSubmit(onSubmit)} className=" flex flex-col w-full gap-4">
                  {/* Name */}
                  <div className="flex flex-col gap-4 md:flex-row w-full">
                     <div className="flex flex-col gap-2 w-full">
                        <label className="text-sm text-gray-700">{t("consentModificationRequestName")}</label>
                        <input
                           type="text"
                           {...register("last_name", {
                              required: t("consentModificationRequestNameRequired"),
                           })}
                           className="ring-2 ring-gray-300 rounded-md p-2 placeholder:text-sm"
                           placeholder={t("consentModificationRequestNamePlaceholder")}
                        />
                        {errors.last_name && (
                           <p className="text-red-500 text-sm">{errors.last_name.message}</p>
                        )}
                     </div>
                     <div className="flex flex-col gap-2 w-full">
                        <label className="text-sm text-gray-700">{t("consentModificationRequestFirstName")}</label>
                        <input
                           type="text"
                           {...register("first_name", { required: t("consentModificationRequestFirstNameRequired") })}
                           className="ring-2 ring-gray-300 rounded-md p-2 placeholder:text-sm"
                           placeholder={t("consentModificationRequestFirstNamePlaceholder")}
                        />
                        {errors.first_name && (
                           <p className="text-red-500 text-sm">{errors.first_name.message}</p>
                        )}
                     </div>
                  </div>
                  <div className="flex flex-col gap-4 md:flex-row  w-full">
                     {/* Email */}
                     <div className=" flex flex-col gap-2 w-full">
                        <label className="text-sm text-gray-700">{t("consentModificationRequestEmail")}</label>
                        <input
                           type="email"
                           {...register("email", {
                              required: t("consentModificationRequestEmailRequired"),
                              pattern: {
                                 value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/,
                                 message: t("consentModificationRequestEmailInvalid"),
                              },
                           })}
                           className="ring-2 ring-gray-300 rounded-md p-2 placeholder:text-sm"
                           placeholder={t("consentModificationRequestEmailPlaceholder")}
                        />
                        {errors.email && (
                           <p className="text-red-500 text-sm">{errors.email.message}</p>
                        )}
                     </div>

                     {/* Phone */}
                     <div className="flex flex-col gap-2 w-full">
                        <label className="text-sm text-gray-700">{t("consentModificationRequestPhone")}</label>
                        <input
                           type="text"
                           {...register("phone")}
                           className="ring-2 ring-gray-300 rounded-md p-2 placeholder:text-sm"
                           placeholder={t("consentModificationRequestPhonePlaceholder")}
                        />
                        {errors.phone && (
                           <p className="text-red-500 text-sm">{errors.phone.message}</p>
                        )}
                     </div>
                  </div>
                  {/* Message */}
                  <div className="flex flex-col gap-2">
                     <label className="text-sm text-gray-700">{t("consentModificationRequestMessage")}</label>
                     <textarea
                        {...register("message", { required: t("consentModificationRequestMessageRequired") })}
                        className="ring-2 ring-gray-300 rounded-md p-2 placeholder:text-sm w-full"
                        placeholder={t("consentModificationRequestMessagePlaceholder")}
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
                     {isSubmitting ? t("consentModificationRequestSubmitLoading") : t("consentModificationRequestSubmit")}
                  </button>
               </form>
            </div>
         </div>
      </div>
   );
};

export default Contact;
