import { AlertCircle, AlertTriangle, CheckCircle, Info, Trash2, X } from "lucide-react";
import React, { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface PopupProps {
   title: string;
   description: ReactNode[];
   buttons: { label: string; onClick: () => void; className?: string }[];
   isOpen: boolean;
   onClose: () => void;
}

const primaryButtonStyle = "px-4 py-2 bg-pink-600 text-white font-medium rounded-md hover:bg-pink-700 transition focus:ring-2 focus:ring-black/50";
const secondaryButtonStyle = "px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition focus:ring-2 focus:ring-black/50";

export const Popup: React.FC<PopupProps> = ({ title, description, buttons, isOpen, onClose }) => {
   if (!isOpen) return null;

   return (
      <div className="fixed inset-0 bg-black/50 z-1000 flex items-center justify-center p-4" >
         <div className="bg-white rounded-lg shadow-lg max-w-md w-full transform transition-all duration-300 ease-in-out mx-4">
            {/* Header */}
            <div className="p-5 flex items-center justify-between border-b border-gray-100">
               <div className="flex items-center">
                  {title.toLowerCase().includes("eroare") || title.toLowerCase().includes("alerta") || title.toLowerCase().includes("avertisment") ? <AlertCircle className="w-5 h-5 text-red-500 mr-3" /> : null}
                  {title.toLowerCase().includes("atenție") ? <AlertTriangle className="w-5 h-5 text-yellow-500 mr-3" /> : null}
                  {title.toLowerCase().includes("succes") || title.toLowerCase().includes("confirmare") ? <CheckCircle className="w-5 h-5 text-green-500 mr-3" /> : null}
                  {title.toLowerCase().includes("informație") ? <Info className="w-5 h-5 text-blue-500 mr-3" /> : null}
                  {title.toLowerCase().includes("șterge") ? <Trash2 className="w-5 h-5 text-red-500 mr-3" /> : null}
                  <h3 className="text-lg font-medium text-gray-900">{title}</h3>
               </div>
               <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                  <X className="w-5 h-5" />
               </button>
            </div>

            {/* Content */}
            <div className="p-5 min-h-[120px]">
               <div className="space-y-2 text-gray-700 whitespace-pre-line">
                  {description.map((child, index) => (
                     <div key={index}>{child}</div>
                  ))}
               </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-5 py-3 flex justify-end rounded-b-lg gap-2">
               {buttons.map((button, index) => (
                  <button
                     key={index}
                     onClick={() => {
                        button.onClick();
                        onClose();
                     }}
                     className={twMerge(button.className ? (button.className === "primary" ? primaryButtonStyle : button.className === "secondary" ? secondaryButtonStyle : button.className) : primaryButtonStyle)}
                  >
                     {button.label}
                  </button>
               ))}
            </div>
         </div>
      </div>
   );
};
