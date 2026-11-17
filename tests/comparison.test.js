import test from "node:test";
import assert from "node:assert/strict";
import { compareCatalogProducts } from "../comparison.js";
import { OFFERS, PRODUCTS } from "../data.js";

test("comparison returns aligned specifications and qualifying example prices", () => {
  const result = compareCatalogProducts({
    category: "cpu",
    productIds: ["cpu-6", "cpu-8"],
    products: PRODUCTS,
    offers: OFFERS
  });
  assert.equal(result.categoryLabel, "Processors");
  assert.deepEqual(result.columns.map(column => column.lowestExamplePrice), [190, 279]);
  assert.ok(result.specKeys.includes("socket"));
  assert.ok(result.specKeys.includes("watts"));
  assert.ok(!result.specKeys.includes("tier"));
});

test("unavailable and malformed example offers are excluded from price comparison", () => {
  const offers = [
    { componentId: "cpu-6", available: false, price: 1 },
    { componentId: "cpu-6", available: true, price: Number.NaN },
    { componentId: "cpu-6", available: true, price: 210 }
  ];
  const result = compareCatalogProducts({
    category: "cpu",
    productIds: ["cpu-6", "cpu-8"],
    products: PRODUCTS,
    offers
  });
  assert.equal(result.columns[0].lowestExamplePrice, 210);
  assert.equal(result.columns[0].exampleOfferCount, 1);
  assert.equal(result.columns[1].lowestExamplePrice, null);
});

test("comparison requires two or three distinct products from one category", () => {
  const args = { category: "cpu", productIds: ["cpu-6", "cpu-8"], products: PRODUCTS, offers: OFFERS };
  assert.throws(() => compareCatalogProducts({ ...args, productIds: ["cpu-6"] }), /two or three/);
  assert.throws(() => compareCatalogProducts({ ...args, productIds: ["cpu-6", "cpu-6"] }), /different products/);
  assert.throws(() => compareCatalogProducts({ ...args, productIds: ["cpu-6", "gpu-mid"] }), /same category/);
  assert.throws(() => compareCatalogProducts({ ...args, productIds: ["missing", "cpu-8"] }), /Unknown product/);
});

