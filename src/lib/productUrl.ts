// Product pages live at /product/<name-with-dashes>?id=<firestore id>
export const productPath = (product: { id: string; name: string }) => `/product/${encodeURIComponent(product.name.trim().replaceAll(" ", "-"))}?id=${product.id}`;

// Lowest price shown on a product card: the cheapest SKU variant when there are any, otherwise the product price.
// Prices are split into whole and cent parts, kept as strings so 79.05 shows "05" rather than "5".
export const cardPrice = (product: { price?: number; discount_price?: number; sku_variants?: { price: number; discount_price?: number }[] }) => {
   const cheapest = product.sku_variants?.length ? product.sku_variants.reduce((min, cur) => (cur.price < min.price ? cur : min)) : null;
   const price = cheapest ? cheapest.price : product.price;
   const discount = cheapest ? cheapest.discount_price : product.discount_price;
   return {
      price: price?.toFixed(2).split(".") || ["0", "00"],
      discount: discount?.toFixed(2).split("."),
      fromPrice: Boolean(cheapest),
   };
};
