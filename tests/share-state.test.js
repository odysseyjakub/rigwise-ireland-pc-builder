import test from "node:test";
import assert from "node:assert/strict";
import { decodeShareHash, encodeShareHash } from "../share-state.js";
import { COMPONENTS, DEFAULT_BUILD, COUNTIES, PRODUCTS } from "../data.js";

const configuration = { components: COMPONENTS, products: PRODUCTS, counties: COUNTIES };
const sample = { build: { ...DEFAULT_BUILD }, budget: 1250, workload: "creative", county: "Cork" };

test("shared build hashes round-trip every selected part and setting", () => {
  const hash = encodeShareHash(sample);
  assert.ok(hash.startsWith("#build="));
  assert.doesNotMatch(hash.slice(7), /[+/=]/);
  assert.deepEqual(decodeShareHash(hash, configuration), sample);
});

test("share hashes reject malformed, out-of-range and unsupported configurations", () => {
  assert.equal(decodeShareHash("#build=not-base64%%%", configuration), null);
  assert.equal(decodeShareHash(encodeShareHash({ ...sample, budget: 650 }), configuration), null);
  assert.equal(decodeShareHash(encodeShareHash({ ...sample, budget: 6000 }), configuration), null);
  assert.equal(decodeShareHash(encodeShareHash({ ...sample, workload: "mining" }), configuration), null);
  assert.equal(decodeShareHash(encodeShareHash({ ...sample, build: { ...sample.build, cpu: "unknown-product" } }), configuration), null);
});

test("share hashes ignore unknown counties and require each product's correct category", () => {
  const unknownCounty = decodeShareHash(encodeShareHash({ ...sample, county: "Atlantis" }), configuration);
  assert.equal(unknownCounty.county, undefined);

  const wrongCategory = { ...sample, build: { ...sample.build, cpu: PRODUCTS.find(product => product.category === "case").id } };
  assert.equal(decodeShareHash(encodeShareHash(wrongCategory), configuration), null);
});

