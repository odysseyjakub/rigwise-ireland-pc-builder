import test from "node:test";
import assert from "node:assert/strict";
import { isValidGtin, matchAwinProduct } from "../awin-feed.js";
import { VERIFIED_CATALOGUE_PRODUCTS, REFERENCE_BUILD_COMPONENTS, REFERENCE_BUILD } from "../catalogue-data.js";
import { checkCompatibility } from "../compatibility.js";
import { COMPONENTS } from "../data.js";
import { readFile } from "node:fs/promises";

test("manufacturer records have exact identities, dated first-party sources, and no offer claims", () => {
  assert.equal(new Set(VERIFIED_CATALOGUE_PRODUCTS.map(product => product.id)).size, VERIFIED_CATALOGUE_PRODUCTS.length);
  for (const product of VERIFIED_CATALOGUE_PRODUCTS) {
    assert.ok(product.name);
    assert.ok(product.brand);
    assert.match(product.sourceUrl, /^https:\/\//);
    assert.equal(product.sourceCheckedAt, "2026-11-18");
    assert.equal(Object.hasOwn(product, "offers"), false);
    assert.equal(Object.hasOwn(product, "price"), false);
    assert.equal(Object.hasOwn(product, "availability"), false);
  }
});

test("the source-linked catalogue page labels each part as lacking retailer offers", async () => {
  const html = await readFile(new URL("../components.html", import.meta.url), "utf8");
  const script = await readFile(new URL("../components-page.js", import.meta.url), "utf8");
  assert.match(html, /Real parts/);
  assert.match(html, /No invented offers/);
  assert.match(script, /No retailer offer connected/);
  assert.match(script, /sourceUrl/);
  assert.match(script, /noopener noreferrer/);
});

test("the reference build uses every required slot and exposes unresolved checks", () => {
  assert.deepEqual(Object.keys(REFERENCE_BUILD).sort(), COMPONENTS.map(component => component.id).sort());
  assert.equal(REFERENCE_BUILD_COMPONENTS.length, COMPONENTS.length);
  const result = checkCompatibility({
    components: REFERENCE_BUILD_COMPONENTS,
    products: VERIFIED_CATALOGUE_PRODUCTS,
    requirements: { requiresDedicatedGpu: true }
  });
  assert.equal(result.incompatibleCount, 0);
  assert.equal(result.status, "unknown");
  assert.ok(result.checks.some(check => check.id === "cpu-board-bios" && check.status === "unknown"));
  assert.ok(result.checks.some(check => check.id === "cooler-case-fit" && check.status === "unknown"));
  assert.ok(result.checks.some(check => check.id === "psu-capacity" && check.status === "compatible"));
  assert.ok(result.checks.some(check => check.id === "psu-case-length" && check.status === "compatible"));
});

test("an exact Awin brand and part number can match a manufacturer-sourced product", () => {
  const match = matchAwinProduct({
    product: { brand: "Western Digital", manufacturerPartNumber: "WDS100T3X0E" }
  }, VERIFIED_CATALOGUE_PRODUCTS);
  assert.deepEqual(match, { status: "matched", method: "brand_mpn", productId: "wd-black-sn770-1tb" });
});

test("source identifiers retain the manufacturer’s UPC or GTIN format", () => {
  const storage = VERIFIED_CATALOGUE_PRODUCTS.find(product => product.id === "wd-black-sn770-1tb");
  const caseProduct = VERIFIED_CATALOGUE_PRODUCTS.find(product => product.id === "fractal-pop-mini-air-rgb-black");
  assert.equal(storage.gtinFormat, "UPC-A");
  assert.ok(storage.keySpecs.includes("UPC-A 718037887302"));
  assert.equal(isValidGtin(storage.gtin), true);
  assert.equal(caseProduct.gtinFormat, "GTIN-13");
  assert.ok(caseProduct.keySpecs.includes("GTIN-13 7340172703600"));
});
