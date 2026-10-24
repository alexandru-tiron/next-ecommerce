import { Product, Review, SkuVariant, VARIANT_TYPE, Variant } from "@/types/product";
import ProductContent from "@/components/product/ProductContent";
import RelatedProducts from "@/components/product/RelatedProducts";
import RecentlyViewed from "@/components/product/RecentlyViewed";
import { db } from "@/lib/firebaseInit";
import { productPath } from "@/lib/productUrl";
import { siteUrl } from "@/lib/siteUrl";
import { getProductDoc, getRelatedProducts } from "@/queries";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import React from "react";

type ProductPageProps = { params: Promise<{ name: string }>; searchParams: Promise<{ id: string }> };

export async function generateMetadata({ searchParams }: ProductPageProps): Promise<Metadata> {
   const { id } = await searchParams;
   const productDoc = id ? await getProductDoc(id) : null;
   if (!productDoc) return {};

   const product = { id: productDoc.id, ...productDoc.data() } as Product;
   const url = productPath(product);
   return {
      title: product.name,
      description: product.short_description,
      alternates: { canonical: url },
      openGraph: {
         type: "website",
         title: product.name,
         description: product.short_description,
         url,
         images: product.product_images?.slice(0, 1),
      },
   };
}

export default async function SinglePage({ searchParams }: ProductPageProps) {
   const { id } = await searchParams;
   if (!id) {
      notFound();
   }

   // Fetch product data on the server
   const productDoc = await getProductDoc(id);
   if (!productDoc) notFound();

   const product = { id: productDoc.id, ...productDoc.data(), created_at: productDoc.data()?.created_at.toDate() as Timestamp };

   // Variants, SKU variants, reviews and related products load in parallel
   const [variantsSnap, skuVariantsSnap, reviewsSnap, relatedProducts] = await Promise.all([
      getDocs(collection(db, "Products", product.id, "Variants")),
      getDocs(collection(db, "Products", product.id, "SkuVariants")),
      getDocs(collection(db, "Products", product.id, "Reviews")),
      getRelatedProducts(product as Product),
   ]);

   // Variants
   const variants = variantsSnap.docs.map((doc) => {
      if (doc.data().media && doc.data().type === VARIANT_TYPE.MEDIA) (product as Product).product_images.push(doc.data().media);
      return {
         id: doc.id,
         ...doc.data(),
      };
   });

   // SKU variants
   const skuVariants = skuVariantsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
   }));
   // Reviews, newest first
   const reviews = reviewsSnap.docs
      .map((doc) => ({
         id: doc.id,
         ...doc.data(),
         date: (doc.data().date as Timestamp | undefined)?.toDate().toISOString(),
      }))
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

   // Pass data to the Client Component
   return (
      <>
         <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productJsonLd(product as Product, skuVariants as SkuVariant[], reviews as Review[]) }} />
         <ProductContent product={product as Product} variants={variants as Variant[]} skuVariants={skuVariants as SkuVariant[]} reviews={reviews as Review[]} />
         <RelatedProducts products={relatedProducts} />
         <RecentlyViewed currentProductId={product.id} />
      </>
   );
}

// schema.org Product data so search engines can show price, availability and rating
function productJsonLd(product: Product, skuVariants: SkuVariant[], reviews: Review[]) {
   const prices = skuVariants.length > 0 ? skuVariants.map((sku) => sku.discount_price ?? sku.price) : [product.discount_price ?? product.price];
   const availability = product.stoc === 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock";
   const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.short_description,
      image: product.product_images,
      sku: product.product_code,
      brand: { "@type": "Brand", name: product.brand },
      offers:
         prices.length > 1
            ? { "@type": "AggregateOffer", priceCurrency: "RON", lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: prices.length, availability }
            : { "@type": "Offer", priceCurrency: "RON", price: prices[0], availability, url: `${siteUrl}${productPath(product)}` },
      ...(reviews.length > 0 && {
         aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number((reviews.reduce((acc, cur) => acc + cur.stars, 0) / reviews.length).toFixed(1)),
            reviewCount: reviews.length,
         },
      }),
   };
   // Escape "<" so product text can't close the script tag
   return JSON.stringify(jsonLd).replace(/</g, "\\u003c");
}
