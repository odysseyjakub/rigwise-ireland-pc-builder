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
    assert.match(product.sourceCheckedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(Number.isFinite(Date.parse(product.sourceCheckedAt)));
    assert.equal(Object.hasOwn(product, "offers"), false);
    assert.equal(Object.hasOwn(product, "price"), false);
    assert.equal(Object.hasOwn(product, "availability"), false);
  }
});

test("the catalogue includes source-checked AM5 alternatives with exact model identifiers", () => {
  const byId = Object.fromEntries(VERIFIED_CATALOGUE_PRODUCTS.map(product => [product.id, product]));
  const cpu9600x = byId["amd-ryzen-5-9600x-box"];
  const cpu9700x = byId["amd-ryzen-7-9700x-box"];
  const board = byId["msi-b850-gaming-plus-wifi"];
  const gpu = byId["asus-dual-rtx5070-o12g"];

  assert.equal(cpu9600x.manufacturerPartNumber, "100-100001405WOF");
  assert.deepEqual([cpu9600x.specs.socket, cpu9600x.specs.coreCount, cpu9600x.specs.threadCount, cpu9600x.specs.watts], ["AM5", 6, 12, 65]);
  assert.equal(cpu9600x.specs.thermalSolutionIncluded, false);
  assert.equal(cpu9700x.manufacturerPartNumber, "100-100001404WOF");
  assert.deepEqual([cpu9700x.specs.coreCount, cpu9700x.specs.threadCount, cpu9700x.specs.maxBoostClockGHz], [8, 16, 5.5]);
  assert.deepEqual([board.specs.socket, board.specs.chipset, board.specs.form, board.specs.memorySlots], ["AM5", "B850", "ATX", 4]);
  assert.deepEqual(board.specs.supportedCpuSeries, ["Ryzen 7000", "Ryzen 8000", "Ryzen 9000"]);
  assert.equal(gpu.manufacturerPartNumber, "DUAL-RTX5070-O12G");
  assert.deepEqual([gpu.specs.memoryGb, gpu.specs.length, gpu.specs.thicknessSlots, gpu.specs.recommendedSystemPowerW], [12, 249, 2.53, 750]);
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

test("the source catalogue exposes an accessible, price-free manufacturer comparison", async () => {
  const [html, script] = await Promise.all([
    readFile(new URL("../components.html", import.meta.url), "utf8"),
    readFile(new URL("../components-page.js", import.meta.url), "utf8")
  ]);
  for (const id of ["catalogue-compare-category", "catalogue-compare-model-a", "catalogue-compare-model-b", "catalogue-compare-model-c"]) {
    assert.match(html, new RegExp('id="' + id + '"'));
    assert.match(html, new RegExp('for="' + id + '"'));
  }
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /No prices or retailer offers are included/);
  assert.match(script, /compareManufacturerProducts/);
  assert.match(script, /Not recorded in this catalogue/);
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

test("a newer source-linked AM5 build reports its 650 W supply warning and unresolved connector evidence", () => {
  const selected = {
    cpu: "amd-ryzen-5-7600-box",
    cooler: "amd-wraith-stealth-included",
    motherboard: "msi-pro-b650m-p",
    memory: "kingston-fury-beast-32gb-ddr5-6000",
    graphics: "asus-dual-rtx5070-o12g",
    storage: "wd-black-sn770-1tb",
    power: "corsair-rm650e-2025-eu",
    case: "fractal-pop-mini-air-rgb-black"
  };
  const result = checkCompatibility({
    components: COMPONENTS.map(component => ({ ...component, productId: selected[component.id] })),
    products: VERIFIED_CATALOGUE_PRODUCTS,
    requirements: { requiresDedicatedGpu: true }
  });
  assert.equal(result.incompatibleCount, 0);
  assert.equal(result.checks.find(check => check.id === "psu-capacity").status, "warning");
  assert.equal(result.checks.find(check => check.id === "gpu-board-interface").status, "warning");
  assert.equal(result.checks.find(check => check.id === "gpu-power-connectors").status, "unknown");
});

test("the source-linked build exposes labelled model selectors that refresh checks", async () => {
  const [html, script] = await Promise.all([
    readFile(new URL("../components.html", import.meta.url), "utf8"),
    readFile(new URL("../components-page.js", import.meta.url), "utf8")
  ]);
  assert.match(html, /id="reference-build-controls"/);
  assert.match(html, /Configure documented models/);
  assert.match(script, /populateReferenceBuildControls/);
  assert.match(script, /aria-label/, "model selectors should have accessible names");
  assert.match(script, /addEventListener\("change", renderChecks\)/);
  assert.match(html, /no prices or retailer offers are shown/i);
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
