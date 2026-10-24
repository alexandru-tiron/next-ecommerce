"use client";

import app from "@/lib/firebaseInit";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Search, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

// Rebuilds the Algolia search index from Firestore (the admin-only syncAllProductsToAlgolia function)
const ReindexSearchButton = () => {
   const t = useTranslations("Admin");
   const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
   const [result, setResult] = useState("");

   const reindex = async () => {
      setStatus("running");
      try {
         const sync = httpsCallable<void, { successCount: number; errorCount: number }>(getFunctions(app, "europe-west3"), "syncAllProductsToAlgolia");
         const { data } = await sync();
         setResult(t("reindexResult", { success: data.successCount, errors: data.errorCount }));
         setStatus("done");
      } catch (error) {
         console.error("Error reindexing search:", error);
         setStatus("error");
      }
   };

   return (
      <div className="flex items-center gap-3">
         {status === "done" && <span className="text-sm text-green-700 hidden md:inline">{result}</span>}
         {status === "error" && <span className="text-sm text-red-600 hidden md:inline">{t("reindexError")}</span>}
         <button
            onClick={reindex}
            disabled={status === "running"}
            title={t("reindexSearchHint")}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
         >
            {status === "running" ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            {t("reindexSearch")}
         </button>
      </div>
   );
};

export default ReindexSearchButton;
