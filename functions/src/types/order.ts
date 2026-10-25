import { Timestamp } from "firebase-admin/firestore";

export interface CartProduct {
   id: string;
   product_id: string;
   product_name: string;
   product_code: string;
   product_image: string;
   variant_id?: string;
   variant_name?: string;
   sku_variant_id?: string;
   sku_variant_name?: string;
   product_price: number;
   discount?: boolean;
   discount_price?: number;
   quantity: number;
}
// Address forms save the short fields as text or as a number
export type Address = {
   id?: string;
   city: string;
   county: string;
   postal_code: number | string;
   street: string;
   street_no: number | string;
   apartment?: string | number;
   building?: string | number;
   building_no?: string | number;
   floor?: number | string;
   intercom?: string | number;
   details?: string;
   business?: boolean;
   business_details?: {
      bank?: string;
      cui: string;
      iban?: string;
      name: string;
      reg_no: string;
   };
};

export interface OrderData {
   user_id: string;
   first_name: string;
   last_name: string;
   email: string;
   phone_no: string;
   products: CartProduct[];
   shipping_address_id?: string;
   billing_address_id?: string;
   shipping_address: Address;
   billing_address: Address;
   shipping_price: number;
   total: number;
   date: Timestamp | { _seconds: number; _nanoseconds: number };
   is_business?: boolean;
   voucher?: boolean;
   voucher_id?: string;
   voucher_discount?: number; // amount taken off the products subtotal by the voucher
   locale?: "en" | "ro" | "de"; // language the customer ordered in, for their e-mails
   currency?: string; // ISO code of the store currency when the order was placed; missing on older orders, which were in RON
   vat_rate?: number; // VAT percentage the prices included when the order was placed
   vat_amount?: number; // VAT contained in the order total
   payment_method?: "cod" | "stripe" | "netopia"; // missing on older orders, which were cash on delivery
   payment_status?: "on_delivery" | "pending" | "paid" | "failed" | "expired" | "refunded";
   payment_id?: string; // current Stripe Checkout Session id or NETOPIA order reference
   stock_reserved?: boolean; // stock was taken off when the order was placed
   stock_restored?: boolean; // stock was put back after the order was rejected
   idempotency_key?: string; // Client-generated unique key
   status?: "pending" | "accepted" | "rejected" | "shipped" | "delivered";
   tracking_number?: string;
   // Invoice related fields
   invoice_id?: string;
   invoice_number?: string;
   invoice_url?: string;
   invoice_date?: Timestamp | { _seconds: number; _nanoseconds: number };
}
