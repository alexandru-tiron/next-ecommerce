"use client";

import * as React from "react";

interface TabsProps {
   value: string;
   onValueChange: (value: string) => void;
   children: React.ReactNode;
   className?: string;
}

interface TabsTriggerProps {
   value: string;
   children: React.ReactNode;
   className?: string;
}

interface TabsContentProps {
   value: string;
   children: React.ReactNode;
   className?: string;
}

interface TabsListProps {
   children: React.ReactNode;
   className?: string;
}

// Define the custom event type
interface TabChangeEventDetail {
   value: string;
}

export const Tabs: React.FC<TabsProps> = ({ value, onValueChange, children, className = "" }) => {
   // Store the current value in a ref to access it in event listeners
   const valueRef = React.useRef<string>(value);

   // Update the ref when the value changes
   React.useEffect(() => {
      valueRef.current = value;
   }, [value]);

   React.useEffect(() => {
      const handleTabChange = (e: CustomEvent<TabChangeEventDetail>) => {
         if (e.detail.value !== valueRef.current) {
            onValueChange(e.detail.value);
         }
      };

      const tabsElement = document.querySelector("[data-tabs]");
      tabsElement?.addEventListener("tabsChange", handleTabChange as EventListener);

      return () => {
         tabsElement?.removeEventListener("tabsChange", handleTabChange as EventListener);
      };
   }, [onValueChange]);

   return (
      <div className={className} data-tabs={true} data-value={value}>
         {children}
      </div>
   );
};

export const TabsList: React.FC<TabsListProps> = ({ children, className = "" }) => {
   return <div className={className}>{children}</div>;
};

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ value, children, className = "" }) => {
   return (
      <button
         className={className}
         onClick={() => {
            const event = new CustomEvent<TabChangeEventDetail>("tabsChange", {
               detail: { value },
            });
            document.querySelector("[data-tabs]")?.dispatchEvent(event);
         }}
      >
         {children}
      </button>
   );
};

export const TabsContent: React.FC<TabsContentProps> = ({ value, children, className = "" }) => {
   const [isActive, setIsActive] = React.useState(false);

   React.useEffect(() => {
      const updateActiveState = () => {
         const tabsElement = document.querySelector("[data-tabs]");
         const currentValue = tabsElement?.getAttribute("data-value");
         setIsActive(currentValue === value);
      };

      // Initial check
      updateActiveState();

      // Listen for tab changes
      const handleTabChange = () => {
         updateActiveState();
      };

      const tabsElement = document.querySelector("[data-tabs]");
      tabsElement?.addEventListener("tabsChange", handleTabChange);

      // Create a MutationObserver to watch for changes to the data-value attribute
      const observer = new MutationObserver((mutations) => {
         mutations.forEach((mutation) => {
            if (mutation.type === "attributes" && mutation.attributeName === "data-value") {
               updateActiveState();
            }
         });
      });

      if (tabsElement) {
         observer.observe(tabsElement, { attributes: true });
      }

      return () => {
         tabsElement?.removeEventListener("tabsChange", handleTabChange);
         observer.disconnect();
      };
   }, [value]);

   if (!isActive) return null;
   return <div className={className}>{children}</div>;
};
