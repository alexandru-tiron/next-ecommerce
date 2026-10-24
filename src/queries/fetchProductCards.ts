import { db } from "@/lib/firebaseInit";
import { Product, SkuVariant } from "@/types/product";
import { collection, documentId, DocumentSnapshot, getDocs, query, where } from "firebase/firestore";

// The fields a product card needs, as plain data that can be passed to client components
export type ProductCardData = Pick<Product, "id" | "name" | "brand" | "short_description" | "product_images" | "price" | "discount_price"> & {
   sku_variants?: Pick<SkuVariant, "price" | "discount_price">[];
};

async function toCardData(productDoc: DocumentSnapshot): Promise<ProductCardData> {
   const data = productDoc.data() as Product;
   const skuVariantsSnap = await getDocs(collection(db, "Products", productDoc.id, "SkuVariants"));
   return {
      id: productDoc.id,
      name: data.name,
      brand: data.brand,
      short_description: data.short_description,
      product_images: data.product_images || [],
      price: data.price,
      discount_price: data.discount_price ?? undefined,
      sku_variants: skuVariantsSnap.docs.map((sku) => ({ price: sku.data().price, discount_price: sku.data().discount_price ?? undefined })),
   };
}

// Card data for the given product ids, in the same order; ids that no longer exist are skipped
export async function getProductCards(ids: string[]): Promise<ProductCardData[]> {
   if (ids.length === 0) return [];
   // Firestore "in" queries accept at most 30 values, so larger lists are fetched in chunks
   const chunks = Array.from({ length: Math.ceil(ids.length / 30) }, (_, i) => ids.slice(i * 30, i * 30 + 30));
   const snaps = await Promise.all(chunks.map((chunk) => getDocs(query(collection(db, "Products"), where(documentId(), "in", chunk)))));
   const cards = await Promise.all(snaps.flatMap((snap) => snap.docs).map(toCardData));
   return ids.map((id) => cards.find((card) => card.id === id)).filter((card): card is ProductCardData => Boolean(card));
}
