"use client";

import { useRef, useState } from "react";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Camera, RefreshCw, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { storage } from "@/lib/firebaseInit";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_SMALL_BYTES = 200 * 1024;

// An image stored in Storage under Branding/, e.g. the logo. The new link is passed to onChange;
// it is saved with the other settings when the admin clicks Save.
export default function ImageUploadField({ id, label, hint, value, onChange, accept, previewClassName = "h-16 w-40" }: { id: string; label: string; hint: string; value: string; onChange: (url: string) => void; accept: string; previewClassName?: string }) {
   const t = useTranslations("StoreSettings");
   const input = useRef<HTMLInputElement>(null);
   const [uploading, setUploading] = useState(false);
   const [error, setError] = useState("");

   const upload = async (file: File) => {
      setError("");
      // The Storage rules allow SVG and .ico files up to 200 KB and other images up to 5 MB
      const small = file.type === "image/svg+xml" || file.type.includes("icon");
      if (file.size > (small ? MAX_SMALL_BYTES : MAX_BYTES)) {
         setError(t("fileTooLarge", { size: small ? "200 KB" : "5 MB" }));
         return;
      }
      try {
         setUploading(true);
         const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "img";
         const fileRef = ref(storage, `Branding/${id}-${Date.now()}.${extension}`);
         await uploadBytes(fileRef, file, { contentType: file.type, cacheControl: "public,max-age=31536000" });
         onChange(await getDownloadURL(fileRef));
      } catch (uploadError) {
         setError(t("uploadFailed", { error: (uploadError as Error).message }));
      } finally {
         setUploading(false);
         if (input.current) input.current.value = "";
      }
   };

   return (
      <div>
         <span className="block text-sm font-medium text-gray-700">{label}</span>
         <div className="mt-2 flex items-center gap-4">
            <div className={`${previewClassName} flex items-center justify-center rounded-md border border-gray-200 bg-[conic-gradient(#f3f4f6_25%,#fff_0_50%,#f3f4f6_0_75%,#fff_0)] bg-[length:16px_16px] overflow-hidden`}>
               {/* eslint-disable-next-line @next/next/no-img-element -- any size or format, including SVG */}
               {value ? <img src={value} alt="" className="max-h-full max-w-full object-contain" /> : <Camera className="h-6 w-6 text-gray-300" />}
            </div>
            <div className="flex flex-col gap-2">
               <input ref={input} id={id} type="file" accept={accept} className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
               <label htmlFor={id} className={`inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer ${uploading ? "pointer-events-none opacity-50" : ""}`}>
                  {uploading ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
                  {uploading ? t("uploading") : value ? t("replace") : t("upload")}
               </label>
               {value && (
                  <button type="button" onClick={() => onChange("")} className="inline-flex items-center px-3 py-1.5 rounded-md text-sm text-red-600 hover:bg-red-50">
                     <Trash2 className="h-4 w-4 mr-1.5" />
                     {t("remove")}
                  </button>
               )}
            </div>
         </div>
         <p className="mt-1 text-xs text-gray-500">{hint}</p>
         {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
   );
}
