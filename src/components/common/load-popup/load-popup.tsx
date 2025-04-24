"use client";
import React from "react";
import Spinner from "@/assets/spinner.svg";
import { useTranslations } from "next-intl";

export const LoadingPopup = (props: { isOpen: boolean }) => {
   const t = useTranslations("Popup");
   const { isOpen } = props;
   if (!isOpen) {
      return null; // If isOpen is false, don't render anything
   } else {
      return (
         <div className="fixed inset-0 bg-black/50 z-1000 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-sm w-full transform transition-all duration-300 ease-in-out mx-4">
               <div className="p-5 flex items-center justify-between border-b border-gray-100">
                  <div className="flex items-center">
                     <h2 className="text-lg font-semibold text-gray-900">{t("loading")}</h2>
                  </div>
               </div>
               <div className="p-5 ">
                  <p className="space-y-2 text-gray-700 whitespace-pre-line">{t("loadingDescription")}</p>
               </div>
               <div className="flex justify-end mt-auto h-auto mb-4">
                  <Spinner className=" mt-4 w-14 h-auto animate-rotator [animation-duration:1.4s]" src="./images/spinner.svg" alt="Spinner" />
               </div>
            </div>
         </div>
      );
   }
};
