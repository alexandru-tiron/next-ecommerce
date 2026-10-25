import { FunctionsErrorCode, HttpsError } from "firebase-functions/v2/https";
import { StoreErrorCode, StoreErrorParams, storeErrorText } from "@core/errors";

// An error for the store to show: the code (with its parameters) travels in the error details, so the
// store can translate it, and the English text is the message. Extra details, e.g. which products failed, go alongside.
export function storeError(status: FunctionsErrorCode, code: StoreErrorCode, params: StoreErrorParams = {}, extra: Record<string, unknown> = {}) {
   return new HttpsError(status, storeErrorText(code, params), { ...extra, code, params });
}
