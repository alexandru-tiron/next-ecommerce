// Rebuilds the Algolia index from the products in Firestore, with the same records the Cloud Functions write.
// Usage:
//   npm run algolia:reindex -- --project <id> --yes   reindex a real project
//   npm run algolia:reindex -- --dry-run              build the records from the emulators and only print a summary
// Admins can also reindex from Admin → Settings → Reindex search.
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { algoliaConfig, algoliaRequest, connectFirebase, parseArgs, waitForAlgoliaTask } from "./lib/firebase.mjs";

const args = parseArgs();
const dryRun = Boolean(args["dry-run"]);
if (!dryRun && !args.yes) throw new Error("Reindexing replaces the live search index: pass --yes (or --dry-run to only check the records).");

const { projectId, emulator } = connectFirebase(args);
const db = getFirestore();

// Firestore Timestamps are stored in Algolia as { _seconds, _nanoseconds } (the replicas sort on created_at._seconds)
const plain = (value) => {
   if (value instanceof Timestamp) return { _seconds: value.seconds, _nanoseconds: value.nanoseconds };
   if (Array.isArray(value)) return value.map(plain);
   if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, plain(item)]));
   return value;
};
const withIds = (snap) => snap.docs.map((doc) => ({ id: doc.id, ...plain(doc.data()) }));

const products = await db.collection("Products").get();
const records = await Promise.all(
   products.docs.map(async (doc) => {
      const [variants, skuVariants] = await Promise.all([doc.ref.collection("Variants").get(), doc.ref.collection("SkuVariants").get()]);
      return { objectID: doc.id, ...plain(doc.data()), variants: withIds(variants), sku_variants: withIds(skuVariants) };
   })
);

const tooBig = records.filter((record) => Buffer.byteLength(JSON.stringify(record)) > 10_000).map((record) => record.objectID);
if (tooBig.length) console.warn(`warning: records over 10 KB (the free plan limit): ${tooBig.join(", ")}`);
console.log(`${records.length} products read from ${emulator ? "the emulators" : projectId}`);

if (dryRun) process.exit(0);

const config = algoliaConfig();
for (let i = 0; i < records.length; i += 500) {
   const { taskID } = await algoliaRequest(config, "POST", `/indexes/${config.indexName}/batch`, {
      requests: records.slice(i, i + 500).map((body) => ({ action: "addObject", body })),
   });
   await waitForAlgoliaTask(config, config.indexName, taskID);
}
const stats = await algoliaRequest(config, "GET", `/indexes/${config.indexName}?hitsPerPage=0`);
console.log(`indexed ${records.length} products; ${config.indexName} now has ${stats.nbHits} records`);
