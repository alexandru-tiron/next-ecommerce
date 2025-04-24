"use client";
// PopUpContext.js
import { ReactNode, createContext, useContext, useMemo, useState, FC } from "react";
import { Popup } from "../components/common/popup/popup";
import { LoadingPopup } from "../components/common/load-popup/load-popup";
interface Popup {
   title: string;
   description: Array<React.ReactElement>;
   buttons: { label: string; onClick: () => void; className?: string }[];
}
interface PopupContextProps {
   setPopup: React.Dispatch<React.SetStateAction<null | Popup>>;
   setLoadPop: React.Dispatch<React.SetStateAction<boolean>>;
}

interface PopupProviderProps {
   children: ReactNode;
}

const PopUpContext = createContext<PopupContextProps | null>(null);

export const PopUpProvider: FC<PopupProviderProps> = ({ children }) => {
   const [popup, setPopup] = useState<null | Popup>(null);
   const [loadPop, setLoadPop] = useState<boolean>(false);
   const popState = useMemo(
      () => ({
         setPopup,
         setLoadPop,
      }),
      []
   );
   return (
      <PopUpContext.Provider value={popState}>
         {children}
         {popup && <Popup isOpen={!!popup} onClose={() => setPopup(null)} title={popup.title} description={popup.description} buttons={popup.buttons} />}
         {loadPop && <LoadingPopup isOpen={loadPop} />}
      </PopUpContext.Provider>
   );
};

export const usePopupContext = () => {
   const context = useContext(PopUpContext);
   if (!context) {
      // context returns null here
      throw new Error("useLoading must be used within a LoadingProvider", {
         cause: context,
      });
   }
   return context;
};
