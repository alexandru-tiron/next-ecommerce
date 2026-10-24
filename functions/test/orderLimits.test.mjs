// Runs against the compiled functions code: npm test (builds first)
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { isValidQuantity, MAX_LINE_QUANTITY } = require("../lib/utils/orderLimits.js");

test("whole quantities from one up to the limit are accepted", () => {
   assert.equal(isValidQuantity(1), true);
   assert.equal(isValidQuantity(MAX_LINE_QUANTITY), true);
});

test("zero, negative, fractional and oversized quantities are rejected", () => {
   for (const quantity of [0, -1, -5, 0.5, 1.5, MAX_LINE_QUANTITY + 1, Infinity, NaN]) {
      assert.equal(isValidQuantity(quantity), false, `quantity ${quantity}`);
   }
});

test("quantities that aren't numbers are rejected", () => {
   for (const quantity of ["2", null, undefined, {}, [1]]) {
      assert.equal(isValidQuantity(quantity), false, `quantity ${JSON.stringify(quantity)}`);
   }
});
