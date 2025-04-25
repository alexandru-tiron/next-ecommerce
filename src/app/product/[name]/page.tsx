import { Product, Review, SkuVariant, VARIANT_TYPE, Variant } from "@/types/product";
import ProductContent from "@/components/product/ProductContent";
import { db } from "@/lib/firebaseInit";
import { collection, doc, getDoc, getDocs, Timestamp } from "firebase/firestore";
import { notFound } from "next/navigation";
import React from "react";

export default async function SinglePage({ searchParams }: { params: { name: string }; searchParams: { id: string } }) {
   console.log("searchParams:", await searchParams); // Log to debug

   const { id } = await searchParams;
   if (!id) {
      notFound();
   }

   // Fetch product data on the server
   const productDoc = await getDoc(doc(db, "Products", id));
   if (!productDoc.exists) notFound();

   const product = { id: productDoc.id, ...productDoc.data(), created_at: productDoc.data()?.created_at.toDate() as Timestamp };

   // Fetch variants
   const variantsSnap = await getDocs(collection(db, "Products", product.id, "Variants"));
   const variants = variantsSnap.docs.map((doc) => {
      if (doc.data().media && doc.data().type === VARIANT_TYPE.MEDIA) (product as Product).product_images.push(doc.data().media);
      return {
         id: doc.id,
         ...doc.data(),
      };
   });

   // Fetch SKU variants
   const skuVariantsSnap = await getDocs(collection(db, "Products", product.id, "SkuVariants"));
   const skuVariants = skuVariantsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
   }));
   // Fetch reviews
   const reviewsSnap = await getDocs(collection(db, "Products", product.id, "Reviews"));
   const reviews = reviewsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
   }));
   // Pass data to the Client Component
   return <ProductContent product={product as Product} variants={variants as Variant[]} skuVariants={skuVariants as SkuVariant[]} reviews={reviews as Review[]} />;
}
