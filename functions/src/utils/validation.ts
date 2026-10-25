import { logger } from "firebase-functions/v2";
import { z } from "zod";
import { StoreErrorCode } from "@core/errors";
import { storeError } from "./errors";

// A Firestore document id sent by the client. No slashes, so it can't point into another collection.
export const docId = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);

// Checks a callable's input against its schema, removing fields the schema doesn't list.
// Anything else is rejected with invalid-argument and an error code, chosen per field when a function is given.
export function parseInput<T extends z.ZodType>(schema: T, data: unknown, code: StoreErrorCode | ((field: PropertyKey | undefined) => StoreErrorCode) = "invalid_input"): z.infer<T> {
   const result = schema.safeParse(data);
   if (result.success) return result.data;
   const field = result.error.issues[0]?.path[0];
   // Which fields failed and why, without their values
   logger.warn("[Input] Request rejected:", result.error.issues.slice(0, 5).map((issue) => `${issue.path.join(".")}: ${issue.code}`));
   throw storeError("invalid-argument", typeof code === "string" ? code : code(field));
}
