import { createHash, createPublicKey, createVerify, KeyObject, X509Certificate } from "crypto";

// The payment rules are shared with the storefront (packages/core); verifying NETOPIA's signature needs Node's crypto
export * from "@core/payments";

const base64Url = (input: string) => Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");

function publicKeyFrom(pem: string): KeyObject {
   return pem.includes("BEGIN CERTIFICATE") ? new X509Certificate(pem).publicKey : createPublicKey(pem);
}

export type NetopiaTokenCheck = { ok: true } | { ok: false; reason: string };

// Verifies the Verification-token header NETOPIA sends with each IPN: an RSA-signed JWT whose issuer is
// "NETOPIA Payments", whose audience is our POS signature and whose `sub` is the base64 SHA-512 of the raw body
export function verifyNetopiaToken(token: string | undefined, rawBody: Buffer | string, publicKeyPem: string, posSignature: string, now = Date.now()): NetopiaTokenCheck {
   if (!token) return { ok: false, reason: "missing token" };
   const parts = token.split(".");
   if (parts.length !== 3) return { ok: false, reason: "malformed token" };
   const [headerPart, payloadPart, signaturePart] = parts;

   let header: { alg?: string };
   let claims: { iss?: string; aud?: string | string[]; sub?: string; exp?: number; nbf?: number };
   try {
      header = JSON.parse(base64Url(headerPart).toString("utf8"));
      claims = JSON.parse(base64Url(payloadPart).toString("utf8"));
   } catch {
      return { ok: false, reason: "malformed token" };
   }

   const bits = header.alg?.match(/^RS(256|384|512)$/)?.[1];
   if (!bits) return { ok: false, reason: `unexpected algorithm ${header.alg}` };
   const signatureValid = createVerify(`RSA-SHA${bits}`).update(`${headerPart}.${payloadPart}`).verify(publicKeyFrom(publicKeyPem), base64Url(signaturePart));
   if (!signatureValid) return { ok: false, reason: "invalid signature" };

   if (claims.iss !== "NETOPIA Payments") return { ok: false, reason: "invalid issuer" };
   const audience = Array.isArray(claims.aud) ? claims.aud[0] : claims.aud;
   if (!audience || audience !== posSignature) return { ok: false, reason: "invalid audience" };
   const seconds = Math.floor(now / 1000);
   if (typeof claims.exp === "number" && claims.exp < seconds) return { ok: false, reason: "token expired" };
   if (typeof claims.nbf === "number" && claims.nbf > seconds) return { ok: false, reason: "token not yet valid" };

   const bodyHash = createHash("sha512").update(rawBody).digest("base64");
   if (claims.sub !== bodyHash) return { ok: false, reason: "payload hash mismatch" };
   return { ok: true };
}
