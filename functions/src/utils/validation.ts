import { HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";

// A Firestore document id sent by the client. No slashes, so it can't point into another collection.
export const docId = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);

// Checks a callable's input against its schema, removing fields the schema doesn't list.
// Anything else is rejected with invalid-argument and a customer-facing message, chosen per field when a function is given.
export function parseInput<T extends z.ZodType>(schema: T, data: unknown, message: string | ((field: PropertyKey | undefined) => string)): z.infer<T> {
   const result = schema.safeParse(data);
   if (result.success) return result.data;
   const field = result.error.issues[0]?.path[0];
   throw new HttpsError("invalid-argument", typeof message === "string" ? message : message(field));
}
