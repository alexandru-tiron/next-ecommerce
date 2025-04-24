import type { User as FirebaseUser } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import { CartProduct } from "./product";

export interface User extends FirebaseUser {
   db?: UserData;
}
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
   products: CartProduct[];
   status?: "pending" | "accepted" | "rejected" | "shipped" | "delivered";
   tracking_number?: string;
   idempotency_key?: string;
   invoice_id?: string;
   invoice_number?: string;
   invoice_url?: string;
   invoice_date?: Timestamp | { _seconds: number; _nanoseconds: number };
};

export type Info = {
   store_name: string;
   store_address: string;
   phone_no: string;
   contact_mail: string;
   orders_mail: string;
   support_mail: string;
   facebook_link?: string;
   instagram_link?: string;
   x_link?: string;
   pinterest_link?: string;
};

export type Notifications = {
   send_new_order_mails: boolean;
   send_order_status_update_mails: boolean;
   send_confirmation_mails: boolean;
};

export type Shipping = {
   default_price: number;
   enable_threshold: boolean;
   free_shipping_threshold: number;
};

export interface Slide {
   order: number;
   title: string;
   description?: string;
   image: string;
   url?: string;
   background?: string;
};