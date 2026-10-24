import { Timestamp } from "firebase-admin/firestore";

export enum VARIANT_TYPE {
   COLOUR = "colour",
   MEDIA = "media",
}

export enum SKUVARIANT_TYPE {
   LITERS = "liters",
   KILO = "kilograms",
}

export interface Variant {
   id: string;
   type: string;
   name: string;
   code?: string;
   media?: string;
   description?: string;
}

export interface SkuVariant {
   id: string;
   type: string;
   name: string;
   price: number;
   code?: string;
   discount?: boolean;
   discount_price?: number;
}

export interface Product {
   name: string;
   category_name: string;
   category_id: string;
   subcategory_name: string;
   subcategory_id: string;
   created_at: Timestamp;
   sold: number;
   price: number;
   brand: string;
   product_code: string;
   product_images: string[];
   short_description: string;
   long_description?: string;
   how_to?: string;
   discount?: boolean;
   discount_price?: number;
   stoc?: number;
   weight: number;
   variants?: Variant[]; // Sub Collection
   sku_variants?: SkuVariant[]; // Sub Collection
}

export type Review = {
   id: string;
   date: Timestamp;
   stars: number;
   uid: string;
   username: string;
   verified?: boolean;
   review: string;
};
