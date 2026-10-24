// Configures the Algolia index the store searches, and the sorted replicas it queries.
// Usage: npm run algolia:setup [-- --dry-run]
// Reads ALGOLIA_APP_ID and ALGOLIA_INDEX_NAME from functions/.env, and the write key from ALGOLIA_API_WRITE_KEY in the environment or functions/.secret.local. Safe to run again.
import { algoliaConfig, algoliaRequest, parseArgs, waitForAlgoliaTask } from "./lib/firebase.mjs";

const args = parseArgs();
const config = algoliaConfig();
const INDEX = config.indexName;

// Same attributes on every index, so filters work whichever sort order is chosen
const shared = {
   searchableAttributes: ["name", "brand", "product_code", "category_name", "subcategory_name", "short_description"],
   // brand, size and colour return option counts for the filter sidebar
   attributesForFaceting: ["filterOnly(category_name)", "filterOnly(subcategory_name)", "brand", "sku_variants.name", "variants.name", "filterOnly(discount)", "filterOnly(product_code)"],
   numericAttributesForFiltering: ["price", "sold", "stoc"],
};
const defaultRanking = ["typo", "geo", "words", "filters", "proximity", "attribute", "exact", "custom"];

// Index names are used by ProductList.tsx and admin/products/page.tsx.
// Algolia can't sort by text, so the name_* replicas keep relevance order (they exist so the admin list doesn't error).
const replicas = {
   [`${INDEX}_price_asc`]: ["asc(price)"],
   [`${INDEX}_price_desc`]: ["desc(price)"],
   [`${INDEX}_created_at_desc`]: ["desc(created_at._seconds)"],
   [`${INDEX}_sold_desc`]: ["desc(sold)"],
   [`${INDEX}_sold_asc`]: ["asc(sold)"],
   [`${INDEX}_name_asc`]: [],
   [`${INDEX}_name_desc`]: [],
};

if (args["dry-run"]) {
   console.log(JSON.stringify({ index: INDEX, settings: { ...shared, replicas: Object.keys(replicas) }, replicas }, null, 2));
   process.exit(0);
}

const primary = await algoliaRequest(config, "PUT", `/indexes/${INDEX}/settings?forwardToReplicas=false`, { ...shared, replicas: Object.keys(replicas) });
await waitForAlgoliaTask(config, INDEX, primary.taskID);
console.log(`configured ${INDEX}`);

for (const [replica, sort] of Object.entries(replicas)) {
   const task = await algoliaRequest(config, "PUT", `/indexes/${replica}/settings`, { ...shared, ranking: [...sort, ...defaultRanking] });
   await waitForAlgoliaTask(config, replica, task.taskID);
   console.log(`configured ${replica}${sort.length ? ` (${sort.join(", ")})` : ""}`);
}
