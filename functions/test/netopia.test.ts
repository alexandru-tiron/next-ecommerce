import { createHash, createSign, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyNetopiaToken } from "../src/utils/payments";

const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();
const b64url = (value: string) => Buffer.from(value).toString("base64url");

function signToken(claims: object, alg = "RS512") {
   const head = b64url(JSON.stringify({ alg, typ: "JWT" }));
   const body = b64url(JSON.stringify(claims));
   const signature = createSign(`RSA-SHA${alg.slice(2)}`).update(`${head}.${body}`).sign(privateKey).toString("base64url");
   return `${head}.${body}.${signature}`;
}

const rawBody = JSON.stringify({ payment: { status: 3, ntpID: "123" }, order: { orderID: "abc" } });
const hash = createHash("sha512").update(rawBody).digest("base64");
const goodClaims = { iss: "NETOPIA Payments", aud: ["POS-1"], sub: hash, exp: Math.floor(Date.now() / 1000) + 300 };
const reason = (check: ReturnType<typeof verifyNetopiaToken>) => (check.ok ? "ok" : check.reason);

describe("verifyNetopiaToken", () => {
   it("accepts a correctly signed IPN token", () => {
      expect(verifyNetopiaToken(signToken(goodClaims), rawBody, publicPem, "POS-1")).toEqual({ ok: true });
      expect(verifyNetopiaToken(signToken({ ...goodClaims, aud: "POS-1" }, "RS256"), rawBody, publicPem, "POS-1")).toEqual({ ok: true });
   });

   it("rejects tampered bodies, wrong audience or issuer, expired and unsigned tokens", () => {
      expect(reason(verifyNetopiaToken(signToken(goodClaims), rawBody.replace("3", "5"), publicPem, "POS-1"))).toBe("payload hash mismatch");
      expect(reason(verifyNetopiaToken(signToken(goodClaims), rawBody, publicPem, "OTHER"))).toBe("invalid audience");
      expect(reason(verifyNetopiaToken(signToken({ ...goodClaims, iss: "someone" }), rawBody, publicPem, "POS-1"))).toBe("invalid issuer");
      expect(reason(verifyNetopiaToken(signToken({ ...goodClaims, exp: 1 }), rawBody, publicPem, "POS-1"))).toBe("token expired");
      expect(reason(verifyNetopiaToken(undefined, rawBody, publicPem, "POS-1"))).toBe("missing token");
      const [head, body] = signToken(goodClaims).split(".");
      expect(reason(verifyNetopiaToken(`${head}.${body}.${b64url("forged")}`, rawBody, publicPem, "POS-1"))).toBe("invalid signature");
      const noneHeader = b64url(JSON.stringify({ alg: "none" }));
      expect(reason(verifyNetopiaToken(`${noneHeader}.${body}.`, rawBody, publicPem, "POS-1"))).toMatch(/unexpected algorithm/);
   });

   it("rejects a token signed with another key", () => {
      const other = generateKeyPairSync("rsa", { modulusLength: 2048 }).publicKey.export({ type: "spki", format: "pem" }).toString();
      expect(reason(verifyNetopiaToken(signToken(goodClaims), rawBody, other, "POS-1"))).toBe("invalid signature");
   });
});
