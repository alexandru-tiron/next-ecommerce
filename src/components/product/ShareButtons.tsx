"use client";

import { ReactNode, useEffect, useState } from "react";
import { Check, Facebook, Link2, MessageCircle, Pin, Share2, Twitter } from "lucide-react";
import { useTranslations } from "next-intl";

const ShareButtons = ({ title, image }: { title: string; image?: string }) => {
   const t = useTranslations("ProductPage");
   const [url, setUrl] = useState("");
   const [canShare, setCanShare] = useState(false);
   const [copied, setCopied] = useState(false);

   useEffect(() => {
      setUrl(window.location.href);
      setCanShare(typeof navigator.share === "function");
   }, []);

   if (!url) return null;

   const encodedUrl = encodeURIComponent(url);
   const encodedTitle = encodeURIComponent(title);
   const networks: { name: string; href: string; icon: ReactNode }[] = [
      { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, icon: <Facebook size={18} /> },
      { name: "X", href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`, icon: <Twitter size={18} /> },
      { name: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`, icon: <MessageCircle size={18} /> },
      {
         name: "Pinterest",
         href: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}${image ? `&media=${encodeURIComponent(image)}` : ""}`,
         icon: <Pin size={18} />,
      },
   ];

   const copyLink = async () => {
      try {
         await navigator.clipboard.writeText(url);
         setCopied(true);
         setTimeout(() => setCopied(false), 2000);
      } catch (error) {
         console.error("Error copying link:", error);
      }
   };

   const nativeShare = () => {
      navigator.share({ title, url }).catch(() => {
         // The visitor closed the share sheet
      });
   };

   const buttonClass = "w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors";

   return (
      <div className="flex items-center gap-2 flex-wrap">
         <span className="text-sm text-gray-600 mr-1">{t("share")}:</span>
         {canShare && (
            <button type="button" onClick={nativeShare} className={buttonClass} aria-label={t("share")} title={t("share")}>
               <Share2 size={18} />
            </button>
         )}
         {networks.map((network) => (
            <a key={network.name} href={network.href} target="_blank" rel="noopener noreferrer" className={buttonClass} aria-label={t("shareOn", { network: network.name })} title={t("shareOn", { network: network.name })}>
               {network.icon}
            </a>
         ))}
         <button type="button" onClick={copyLink} className={buttonClass} aria-label={copied ? t("linkCopied") : t("copyLink")} title={copied ? t("linkCopied") : t("copyLink")}>
            {copied ? <Check size={18} className="text-green-600" /> : <Link2 size={18} />}
         </button>
      </div>
   );
};

export default ShareButtons;
