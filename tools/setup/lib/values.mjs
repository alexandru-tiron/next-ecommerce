// Pure helpers for the setup CLI: validation, the configuration files and API request bodies. No I/O here (see values.test.mjs).

// Firebase project ids: 6-30 characters, lowercase letters, digits and hyphens, starting with a letter
export const validProjectId = (id) => /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(id);

export const validSiteUrl = (url) => {
   try {
      const parsed = new URL(url);
      return (parsed.protocol === "https:" || parsed.hostname === "localhost") && !parsed.pathname.replace(/\/$/, "") && !parsed.search && !parsed.hash;
   } catch {
      return false;
   }
};

export const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Firestore locations offered during setup. The Cloud Functions of this version run in europe-west3 (Frankfurt).
export const LOCATIONS = [
   { value: "eur3", name: "Europe (multi-region)" },
   { value: "europe-west3", name: "Frankfurt" },
   { value: "europe-west1", name: "Belgium" },
   { value: "europe-central2", name: "Warsaw" },
   { value: "nam5", name: "United States (multi-region)" },
   { value: "us-central1", name: "Iowa" },
   { value: "us-east1", name: "South Carolina" },
   { value: "asia-southeast1", name: "Singapore" },
   { value: "australia-southeast1", name: "Sydney" },
];

// The web app's Firebase config (from `firebase apps:sdkconfig`) as the store's NEXT_PUBLIC_* variables
export function firebaseEnv(config) {
   return {
      NEXT_PUBLIC_APIKEY: config.apiKey,
      NEXT_PUBLIC_AUTHDOMAIN: config.authDomain,
      NEXT_PUBLIC_PROJECTID: config.projectId,
      NEXT_PUBLIC_STORAGEBUCKET: config.storageBucket,
      NEXT_PUBLIC_MESSAGINGSENDERID: config.messagingSenderId,
      NEXT_PUBLIC_APPID: config.appId,
      NEXT_PUBLIC_MEASUREMENTID: config.measurementId ?? "",
   };
}

// Updates KEY=value lines in an .env file, keeping comments, other variables and their order; new keys go at the end
export function mergeEnv(existing, updates) {
   const lines = existing ? existing.replace(/\r\n/g, "\n").split("\n") : [];
   const pending = new Map(Object.entries(updates).filter(([, value]) => value !== undefined));
   const merged = lines.map((line) => {
      const key = line.match(/^\s*([A-Z0-9_]+)\s*=/)?.[1];
      if (!key || !pending.has(key)) return line;
      const value = pending.get(key);
      pending.delete(key);
      return `${key}=${value}`;
   });
   while (merged.length && merged[merged.length - 1] === "") merged.pop();
   for (const [key, value] of pending) merged.push(`${key}=${value}`);
   return `${merged.join("\n")}\n`;
}

// For printing a planned .env change: values of keys that look secret are hidden
export const maskEnv = (updates) => Object.fromEntries(Object.entries(updates).map(([key, value]) => [key, /KEY|SECRET|PASSWORD|TOKEN/.test(key) && !/^NEXT_PUBLIC_(APIKEY|ALGOLIA_SEARCH_KEY)$/.test(key) && value ? "••••" : value]));

// A monthly budget on the project with e-mail alerts at 50%, 90% and 100% (Cloud Billing Budget API)
export function budgetBody(projectNumber, amount, storeName) {
   return {
      displayName: `${storeName} store`.slice(0, 60),
      budgetFilter: { projects: [`projects/${projectNumber}`] },
      amount: { specifiedAmount: { units: String(Math.round(amount)) } },
      thresholdRules: [{ thresholdPercent: 0.5 }, { thresholdPercent: 0.9 }, { thresholdPercent: 1 }],
   };
}

// A Firestore REST document body from plain values (strings, numbers, booleans, Dates and null)
export function firestoreFields(values) {
   const encode = (value) => {
      if (value === null) return { nullValue: null };
      if (value instanceof Date) return { timestampValue: value.toISOString() };
      if (typeof value === "boolean") return { booleanValue: value };
      if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
      return { stringValue: String(value) };
   };
   return { fields: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, encode(value)])) };
}
