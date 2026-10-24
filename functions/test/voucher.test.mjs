// Runs against the compiled functions code: npm test (builds first)
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { evaluateVoucher, normalizeVoucherCode, voucherMessage } = require("../lib/utils/voucher.js");

const base = { code: "SAVE10", type: "percent", value: 10, active: true };

test("percent vouchers take a share of the subtotal, rounded to bani", () => {
   assert.deepEqual(evaluateVoucher(base, 199.99), { ok: true, discount: 20 });
   assert.deepEqual(evaluateVoucher({ ...base, value: 15 }, 333.33), { ok: true, discount: 50 });
});

test("fixed vouchers never discount more than the subtotal", () => {
   assert.deepEqual(evaluateVoucher({ ...base, type: "fixed", value: 50 }, 300), { ok: true, discount: 50 });
   assert.deepEqual(evaluateVoucher({ ...base, type: "fixed", value: 50 }, 30), { ok: true, discount: 30 });
});

test("percent values are capped at 100", () => {
   assert.deepEqual(evaluateVoucher({ ...base, value: 150 }, 80), { ok: true, discount: 80 });
});

test("inactive, expired and used-up vouchers are rejected", () => {
   const now = Date.parse("2026-10-16T12:00:00Z");
   assert.equal(evaluateVoucher({ ...base, active: false }, 100, now).reason, "inactive");
   assert.equal(evaluateVoucher({ ...base, expires_at: Date.parse("2026-10-15T00:00:00Z") }, 100, now).reason, "expired");
   assert.equal(evaluateVoucher({ ...base, expires_at: { toMillis: () => now + 1000 } }, 100, now).ok, true);
   assert.equal(evaluateVoucher({ ...base, max_uses: 5, uses: 5 }, 100, now).reason, "used_up");
   assert.equal(evaluateVoucher({ ...base, max_uses: 5, uses: 4 }, 100, now).ok, true);
});

test("the minimum order applies to the products subtotal", () => {
   assert.deepEqual(evaluateVoucher({ ...base, min_order: 200 }, 199.99), { ok: false, reason: "min_order", minOrder: 200 });
   assert.equal(evaluateVoucher({ ...base, min_order: 200 }, 200).ok, true);
});

test("codes are compared case-insensitively and without spaces", () => {
   assert.equal(normalizeVoucherCode("  save10 "), "SAVE10");
});

test("each failure has a customer message", () => {
   assert.match(voucherMessage({ ok: false, reason: "min_order", minOrder: 200 }), /200 Lei/);
   assert.match(voucherMessage({ ok: false, reason: "not_found" }), /nu este valid/);
});
