import { Product, Review, SkuVariant } from "@/types/product";
import ProductContent from "@/components/product/ProductContent";
import RelatedProducts from "@/components/product/RelatedProducts";
import RecentlyViewed from "@/components/product/RecentlyViewed";
import { productPath } from "@/lib/productUrl";
import { siteUrl } from "@/lib/siteUrl";
import { getProductPage, getProductReviews, getRelatedProducts } from "@/lib/server/storeData";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import React from "react";

type ProductPageProps = { params: Promise<{ name: string }>; searchParams: Promise<{ id: string }> };

export async function generateMetadata({ searchParams }: ProductPageProps): Promise<Metadata> {
   const { id } = await searchParams;
   const page = id ? await getProductPage(id) : null;
   if (!page) return {};

   const { product } = page;
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

   // Product and variants come from the data cache; reviews are read fresh
   const [page, reviews] = await Promise.all([getProductPage(id), getProductReviews(id)]);
   if (!page) notFound();
   const { product, variants, skuVariants } = page;
   const relatedProducts = await getRelatedProducts(product);

   // Pass data to the Client Component
   return (
      <>
         <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productJsonLd(product, skuVariants, reviews) }} />
         <ProductContent product={product} variants={variants} skuVariants={skuVariants} reviews={reviews} />
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
