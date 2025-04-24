import { Timestamp } from "firebase/firestore";

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

export interface Subcategory {
   id: string;
   name: string;
   icon?: string;
   image?: string;
   description?: string;
}

export interface Category {
   id: string;
   name: string;
   image?: string;
   icon: string;
   description?: string;
   subcategories?: Subcategory[];
}

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
   type: VARIANT_TYPE;
   name: string;
   code?: string;
   media?: string;
   description?: string;
}

export interface SkuVariant {
   id: string;
   type: SKUVARIANT_TYPE;
   name: string;
   price: number;
   code?: string;
   discount?: boolean;
   discount_price?: number;
}
export interface Brand {
   id: string;
   name: string;
   image?: string;
   description?: string;
}

export interface Product {
   id: string;
   name: string;
   category_name: string;
   category_id: string;
   subcategory_name: string;
   subcategory_id: string;
   created_at:
      | Timestamp
      | {
           _seconds: number;
           _nanoseconds: number;
        };
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
   product_of_month?: boolean;
   stoc?: number;
   weight: number;
   variants?: Variant[]; // Sub Collection
   sku_variants?: SkuVariant[]; // Sub Collection
   updated_at: Timestamp | { _seconds: number; _nanoseconds: number };
}

export interface SearchParams {
   cat?: string;
   subcat?: string;
   brand?: string;
   name?: string;
   sort?: string;
   min?: string;
   max?: string;
   size?: string;
   page?: string;
   limit?: number;
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
