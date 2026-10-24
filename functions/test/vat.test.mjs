// Runs against the compiled functions code: npm test (builds first)
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { vatIncluded } = require("../lib/utils/vat.js");

test("extracts the VAT contained in a VAT-inclusive amount", () => {
   assert.equal(vatIncluded(121, 21), 21);
   assert.equal(vatIncluded(1699, 21), 294.87);
   assert.equal(vatIncluded(25, 21), 4.34);
});

test("is zero for a zero or invalid rate", () => {
   assert.equal(vatIncluded(100, 0), 0);
   assert.equal(vatIncluded(100, Number.NaN), 0);
});
