// Runs against the compiled functions code: npm test (builds first)
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createHash, createSign, generateKeyPairSync } from "node:crypto";

const require = createRequire(import.meta.url);
const p = require("../lib/utils/payments.js");

const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicPem = publicKey.export({ type: "spki", format: "pem" });
const b64url = (value) => Buffer.from(value).toString("base64url");
function signToken(claims, alg = "RS512") {
   const head = b64url(JSON.stringify({ alg, typ: "JWT" }));
   const body = b64url(JSON.stringify(claims));
   const signature = createSign(`RSA-SHA${alg.slice(2)}`).update(`${head}.${body}`).sign(privateKey).toString("base64url");
   return `${head}.${body}.${signature}`;
}
const rawBody = JSON.stringify({ payment: { status: 3, ntpID: "123" }, order: { orderID: "abc" } });
const hash = createHash("sha512").update(rawBody).digest("base64");
const goodClaims = { iss: "NETOPIA Payments", aud: ["POS-1"], sub: hash, exp: Math.floor(Date.now() / 1000) + 300 };

test("accepts a correctly signed IPN token", () => {
   assert.deepEqual(p.verifyNetopiaToken(signToken(goodClaims), rawBody, publicPem, "POS-1"), { ok: true });
   assert.deepEqual(p.verifyNetopiaToken(signToken({ ...goodClaims, aud: "POS-1" }, "RS256"), rawBody, publicPem, "POS-1"), { ok: true });
});

test("rejects tampered bodies, wrong audience or issuer, expired and unsigned tokens", () => {
   assert.equal(p.verifyNetopiaToken(signToken(goodClaims), rawBody.replace("3", "5"), publicPem, "POS-1").reason, "payload hash mismatch");
   assert.equal(p.verifyNetopiaToken(signToken(goodClaims), rawBody, publicPem, "OTHER").reason, "invalid audience");
   assert.equal(p.verifyNetopiaToken(signToken({ ...goodClaims, iss: "someone" }), rawBody, publicPem, "POS-1").reason, "invalid issuer");
   assert.equal(p.verifyNetopiaToken(signToken({ ...goodClaims, exp: 1 }), rawBody, publicPem, "POS-1").reason, "token expired");
   assert.equal(p.verifyNetopiaToken(undefined, rawBody, publicPem, "POS-1").reason, "missing token");
   const [h, b] = signToken(goodClaims).split(".");
   assert.equal(p.verifyNetopiaToken(`${h}.${b}.${b64url("forged")}`, rawBody, publicPem, "POS-1").reason, "invalid signature");
   const noneHeader = b64url(JSON.stringify({ alg: "none" }));
   assert.match(p.verifyNetopiaToken(`${noneHeader}.${b}.`, rawBody, publicPem, "POS-1").reason, /unexpected algorithm/);
});

test("rejects a token signed with another key", () => {
   const other = generateKeyPairSync("rsa", { modulusLength: 2048 }).publicKey.export({ type: "spki", format: "pem" });
   assert.equal(p.verifyNetopiaToken(signToken(goodClaims), rawBody, other, "POS-1").reason, "invalid signature");
});

test("maps NETOPIA status codes", () => {
   assert.equal(p.netopiaPaymentStatus(3), "paid");
   assert.equal(p.netopiaPaymentStatus(5), "paid");
   assert.equal(p.netopiaPaymentStatus(8), "refunded");
   assert.equal(p.netopiaPaymentStatus(12), "failed");
   assert.equal(p.netopiaPaymentStatus(23), "expired");
   assert.equal(p.netopiaPaymentStatus(15), "pending");
   assert.equal(p.netopiaPaymentStatus(13), "pending");
});

test("maps Stripe checkout events", () => {
   assert.equal(p.stripeEventPaymentStatus("checkout.session.completed", "paid"), "paid");
   assert.equal(p.stripeEventPaymentStatus("checkout.session.completed", "unpaid"), "pending");
   assert.equal(p.stripeEventPaymentStatus("checkout.session.async_payment_failed"), "failed");
   assert.equal(p.stripeEventPaymentStatus("checkout.session.expired"), "expired");
   assert.equal(p.stripeEventPaymentStatus("customer.created"), null);
});

test("payment status never moves back from paid or refunded", () => {
   assert.equal(p.shouldApplyPaymentStatus("pending", "paid"), true);
   assert.equal(p.shouldApplyPaymentStatus("paid", "expired"), false);
   assert.equal(p.shouldApplyPaymentStatus("paid", "refunded"), true);
   assert.equal(p.shouldApplyPaymentStatus("refunded", "paid"), false);
   assert.equal(p.shouldApplyPaymentStatus("paid", "paid"), false);
   assert.equal(p.shouldApplyPaymentStatus("failed", "paid"), true);
});

test("converts lei to bani without floating point drift", () => {
   assert.equal(p.toMinorUnits(1699.99), 169999);
   assert.equal(p.toMinorUnits(0.1 + 0.2), 30);
});

test("payment settings default to cash on delivery only", () => {
   const settings = p.paymentSettingsFrom(undefined);
   assert.equal(p.isMethodEnabled("cod", settings), true);
   assert.equal(p.isMethodEnabled("stripe", settings), false);
   assert.equal(p.isMethodEnabled("netopia", p.paymentSettingsFrom({ netopia_enabled: true })), false, "NETOPIA needs a POS signature");
   assert.equal(p.isMethodEnabled("netopia", p.paymentSettingsFrom({ netopia_enabled: true, netopia_pos_signature: "POS-1" })), true);
});

test("only redirects back to our own site or localhost", () => {
   const site = "https://shop.example.com";
   assert.equal(p.safeReturnOrigin("https://shop.example.com", site), site);
   assert.equal(p.safeReturnOrigin("http://localhost:3001", site), "http://localhost:3001");
   assert.equal(p.safeReturnOrigin("https://evil.example.com", site), site);
   assert.equal(p.safeReturnOrigin(undefined, site + "/"), site);
});
