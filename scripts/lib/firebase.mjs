// Shared helpers for the maintenance scripts: arguments, env files and a guarded Firebase Admin connection.
// By default every script talks to the local Firebase emulators. A real project needs --project <id>,
// and anything that writes to it also needs --yes.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applicationDefault, initializeApp } from "firebase-admin/app";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// --name value, --name=value and --flag
export function parseArgs(argv = process.argv.slice(2)) {
   const args = {};
   for (let i = 0; i < argv.length; i++) {
      if (!argv[i].startsWith("--")) continue;
      const [key, inline] = argv[i].slice(2).split("=");
      if (inline !== undefined) args[key] = inline;
      else if (argv[i + 1] && !argv[i + 1].startsWith("--")) args[key] = argv[++i];
      else args[key] = true;
   }
   return args;
}

export function readEnvFile(relativePath) {
   const file = path.join(ROOT, relativePath);
   if (!fs.existsSync(file)) return {};
   return Object.fromEntries(
      fs
         .readFileSync(file, "utf8")
         .split(/\r?\n/)
         .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
         .map((line) => [line.slice(0, line.indexOf("=")).trim(), line.slice(line.indexOf("=") + 1).trim().replace(/^"|"$/g, "")])
   );
}

const emulatorPorts = () => JSON.parse(fs.readFileSync(path.join(ROOT, "firebase.json"), "utf8")).emulators ?? {};

/**
 * Connects the Admin SDK and returns { projectId, bucket, emulator }.
 * - No --project: the local emulators (started with `firebase emulators:start` or `emulators:exec`).
 * - --project <id>: that real project, using Application Default Credentials
 *   (`gcloud auth application-default login`, or GOOGLE_APPLICATION_CREDENTIALS pointing at a service account key).
 *   Pass write: true for scripts that change data; they then also require --yes.
 */
export function connectFirebase(args, { write = false } = {}) {
   if (!args.project) {
      const ports = emulatorPorts();
      process.env.FIRESTORE_EMULATOR_HOST ??= `127.0.0.1:${ports.firestore?.port ?? 8080}`;
      process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= `127.0.0.1:${ports.storage?.port ?? 9199}`;
      process.env.FIREBASE_AUTH_EMULATOR_HOST ??= `127.0.0.1:${ports.auth?.port ?? 9099}`;
      // "demo-" project ids keep the emulators fully offline
      const projectId = process.env.GCLOUD_PROJECT || "demo-store";
      const bucket = `${projectId}.appspot.com`;
      initializeApp({ projectId, storageBucket: bucket });
      return { projectId, bucket, emulator: true };
   }

   if (write && !args.yes) {
      throw new Error(`Refusing to change the real project "${args.project}" without --yes. Try it against the emulators first (no --project).`);
   }
   const env = { ...readEnvFile(".env"), ...readEnvFile(".env.local") };
   const bucket = args.bucket || env.NEXT_PUBLIC_STORAGEBUCKET || `${args.project}.appspot.com`;
   initializeApp({ credential: applicationDefault(), projectId: args.project, storageBucket: bucket });
   return { projectId: args.project, bucket, emulator: false };
}

// The download URL Firebase Storage would give for a file uploaded with a download token
export function downloadUrl(bucket, objectPath, token, emulator) {
   const host = emulator ? `http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST}` : "https://firebasestorage.googleapis.com";
   return `${host}/v0/b/${bucket}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
}

// Algolia credentials for the server-side scripts (the write key never goes to the storefront).
// The write key is a Secret Manager secret, so it comes from the environment or functions/.secret.local (gitignored).
export function algoliaConfig() {
   const env = { ...readEnvFile("functions/.env"), ...readEnvFile("functions/.secret.local") };
   const config = { appId: env.ALGOLIA_APP_ID, writeKey: process.env.ALGOLIA_API_WRITE_KEY || env.ALGOLIA_API_WRITE_KEY, indexName: env.ALGOLIA_INDEX_NAME || "products" };
   if (!config.appId) throw new Error("ALGOLIA_APP_ID must be set in functions/.env");
   if (!config.writeKey) {
      throw new Error(
         "The Algolia write key is missing. Set ALGOLIA_API_WRITE_KEY in the environment or in functions/.secret.local, " +
            "for example with the value from: firebase functions:secrets:access ALGOLIA_API_WRITE_KEY"
      );
   }
   return config;
}

export async function algoliaRequest({ appId, writeKey }, method, urlPath, body) {
   const res = await fetch(`https://${appId}.algolia.net/1${urlPath}`, {
      method,
      headers: { "X-Algolia-Application-Id": appId, "X-Algolia-API-Key": writeKey, "Content-Type": "application/json" },
      body: body && JSON.stringify(body),
   });
   const json = await res.json();
   if (!res.ok) throw new Error(`${method} ${urlPath}: ${res.status} ${json.message}`);
   return json;
}

export async function waitForAlgoliaTask(config, indexName, taskID) {
   for (;;) {
      const task = await algoliaRequest(config, "GET", `/indexes/${encodeURIComponent(indexName)}/task/${taskID}`);
      if (task.status === "published") return;
      await new Promise((resolve) => setTimeout(resolve, 500));
   }
}
