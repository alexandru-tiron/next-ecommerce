// One-time links for the setup wizard (/setup). Only the SHA-256 hash of the token is stored, in System/setup,
// which no browser can read; the claimSetup Cloud Function compares the hash and marks the token used.
import { createHash, randomBytes } from "node:crypto";

export const SETUP_TOKEN_DAYS = 7;

export function newSetupToken() {
   const token = randomBytes(32).toString("base64url");
   return { token, hash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + SETUP_TOKEN_DAYS * 24 * 60 * 60 * 1000) };
}

// The token goes after # so it never reaches the server's logs
export const setupLink = (siteUrl, token) => `${siteUrl.replace(/\/$/, "")}/setup#token=${token}`;
