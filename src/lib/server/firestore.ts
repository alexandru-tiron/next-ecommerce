import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { FieldPath, getFirestore, type Firestore, type Query } from "firebase-admin/firestore";
import { collection, doc, documentId, getDoc, getDocs, limit, query, where, type QueryConstraint } from "firebase/firestore";
import { db as clientDb } from "@/lib/firebaseInit";

// Server-side Firestore reads. With FIREBASE_SERVICE_ACCOUNT_KEY set they use the Admin SDK, which App Check
// doesn't apply to, so App Check can then be enforced on Firestore. Without it they fall back to the web SDK,
// which works only while Firestore doesn't enforce App Check.

const APP_NAME = "store-server";
const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === "true";

// A read-only service account key: the JSON file's contents, or the same JSON in base64
function serviceAccount() {
   const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
   if (!raw) return null;
   return JSON.parse(raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
}

let warned = false;
function adminApp(): App | null {
   const existing = getApps().find((app) => app.name === APP_NAME);
   if (existing) return existing;
   if (useEmulators) {
      process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
      return initializeApp({ projectId: "demo-store" }, APP_NAME);
   }
   const account = serviceAccount();
   if (!account) {
      if (!warned && process.env.NODE_ENV === "production") {
         console.warn("FIREBASE_SERVICE_ACCOUNT_KEY isn't set: server pages read Firestore with the web SDK. See docs/SECURITY-SETUP.md.");
         warned = true;
      }
      return null;
   }
   return initializeApp({ credential: cert(account), projectId: account.project_id }, APP_NAME);
}

function adminDb(): Firestore | null {
   const app = adminApp();
   return app ? getFirestore(app) : null;
}

// Firestore values made safe for client components and the data cache (which stores JSON): timestamps become ISO strings
export function plain(value: unknown): unknown {
   if (value === null || typeof value !== "object") return value;
   if (value instanceof Date) return value.toISOString();
   if (typeof (value as { toDate?: unknown }).toDate === "function") return (value as { toDate(): Date }).toDate().toISOString();
   if (Array.isArray(value)) return value.map(plain);
   return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, plain(item)]));
}

export type Row = { id: string } & Record<string, unknown>;
// Use DOCUMENT_ID as the field to filter by document id
export const DOCUMENT_ID = "__id__";
export type ReadOptions = { where?: [field: string, op: "==" | "in", value: unknown][]; limit?: number };

const toRow = (id: string, data: unknown): Row => ({ ...(plain(data) as Record<string, unknown>), id });

export async function readDoc(path: string): Promise<Row | null> {
   const admin = adminDb();
   if (admin) {
      const snap = await admin.doc(path).get();
      return snap.exists ? toRow(snap.id, snap.data()) : null;
   }
   const snap = await getDoc(doc(clientDb, path));
   return snap.exists() ? toRow(snap.id, snap.data()) : null;
}

export async function readCollection(path: string, options: ReadOptions = {}): Promise<Row[]> {
   const admin = adminDb();
   if (admin) {
      let adminQuery: Query = admin.collection(path);
      for (const [field, op, value] of options.where ?? []) adminQuery = adminQuery.where(field === DOCUMENT_ID ? FieldPath.documentId() : field, op, value);
      if (options.limit) adminQuery = adminQuery.limit(options.limit);
      return (await adminQuery.get()).docs.map((snap) => toRow(snap.id, snap.data()));
   }
   const constraints: QueryConstraint[] = (options.where ?? []).map(([field, op, value]) => where(field === DOCUMENT_ID ? documentId() : field, op, value));
   if (options.limit) constraints.push(limit(options.limit));
   return (await getDocs(query(collection(clientDb, path), ...constraints))).docs.map((snap) => toRow(snap.id, snap.data()));
}
