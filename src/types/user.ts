import { Timestamp } from "firebase/firestore";
import { CartProduct } from "./product";

export type UserData = {
   email: string;
   first_name: string;
   last_name: string;
   phone_no?: string;
   shipping_address_id?: string;
   billing_address_id?: string;
   created_at:
      | Timestamp
      | {
           _seconds: number;
           _nanoseconds: number;
        };
   addresses?: Address[];
};

export type BusinessDetails = {
   name: string;
   cui: string;
   reg_no: string;
   bank?: string;
   iban?: string;
};

export interface Address {
   id: string;
   city: string;
   county: string;
   postal_code: number;
   street: string;
   street_no: number;
   apartment?: string;
   building?: string;
   building_no?: string;
   floor?: number;
   intercom?: string;
   details?: string;
   business: boolean;
   business_details?: BusinessDetails ;
}

export type Order = {
   id: string;
   user_id: string;
   email: string;
   first_name: string;
   last_name: string;
   phone_no: string;
   billing_address_id?: string; // Kept for backward compatibility
   shipping_address_id?: string; // Kept for backward compatibility
   billing_address: Address; // Complete address object stored at order time
   shipping_address: Address; // Complete address object stored at order time
   date: Timestamp | { _seconds: number; _nanoseconds: number };
   shipping_price: number;
   total: number;
   is_business: boolean;
   voucher: boolean;
   voucher_id?: string;
   voucher_discount?: number;
   vat_rate?: number;
   vat_amount?: number;
   payment_method?: "cod" | "stripe" | "netopia";
   payment_status?: "on_delivery" | "pending" | "paid" | "failed" | "expired" | "refunded";
   products: CartProduct[];
   status?: "pending" | "accepted" | "rejected" | "shipped" | "delivered";
   tracking_number?: string;
   idempotency_key?: string;
   invoice_id?: string;
   invoice_number?: string;
   invoice_url?: string;
   invoice_date?: Timestamp | { _seconds: number; _nanoseconds: number };
};

// Settings/Info, Settings/Notifications and Settings/Shipping (defaults and validation in packages/core/src/settings.ts)
export type { StoreInfo as Info, NotificationSettings as Notifications, ShippingSettings as Shipping } from "@core/settings";

// VAT percentage included in store prices (Settings/Tax)
export type Tax = {
   vat_rate: number;
};

export interface Slide {
   order: number;
   title: string;
   description?: string;
   image: string;
   url?: string;
   background?: string;
};