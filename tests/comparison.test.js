import test from "node:test";
import assert from "node:assert/strict";
import { compareCatalogProducts, compareManufacturerProducts } from "../comparison.js";
import { VERIFIED_CATALOGUE_PRODUCTS } from "../catalogue-data.js";
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

test("manufacturer comparison aligns source specs without adding example prices", () => {
  const result = compareManufacturerProducts({
    category: "cpu",
    productIds: ["amd-ryzen-5-9600x-box", "amd-ryzen-5-7600-box"],
    products: VERIFIED_CATALOGUE_PRODUCTS
  });
  assert.equal(result.categoryLabel, "Processors");
  assert.equal(result.columns.length, 2);
  assert.ok(result.specKeys.includes("socket"));
  assert.ok(result.specKeys.includes("thermalSolutionIncluded"));
  assert.equal(result.columns[0].specs.coreCount, 6);
  assert.equal(result.columns[0].specs.thermalSolutionIncluded, false);
  assert.equal(result.columns[1].specs.thermalSolutionIncluded, true);
  assert.equal(Object.hasOwn(result.columns[0], "lowestExamplePrice"), false);
});

test("manufacturer comparison rejects incomplete, duplicate and cross-category selections", () => {
  const args = {
    category: "graphics",
    productIds: ["asus-dual-rtx4060-o8g", "asus-dual-rtx5070-o12g"],
    products: VERIFIED_CATALOGUE_PRODUCTS
  };
  assert.throws(() => compareManufacturerProducts({ ...args, productIds: [args.productIds[0]] }), /two or three/);
  assert.throws(() => compareManufacturerProducts({ ...args, productIds: [args.productIds[0], args.productIds[0]] }), /different products/);
  assert.throws(() => compareManufacturerProducts({ ...args, productIds: [args.productIds[0], "amd-ryzen-5-9600x-box"] }), /same category/);
});
