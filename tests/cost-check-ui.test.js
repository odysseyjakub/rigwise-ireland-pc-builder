import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseMinorAmount, parseRateBasisPoints } from "../cost-check-input.js";
import { parseIrishImportFields } from "../cost-check-import-input.js";
import { calculateIrishImportCharges } from "../irish-costs.js";

const read = name => readFile(new URL(`../${name}`, import.meta.url), "utf8");

test("checkout amount parsing preserves cents without binary floating-point rounding", () => {
  assert.equal(parseMinorAmount("899.95", "Parts"), 89995);
  assert.equal(parseMinorAmount("9,5", "Delivery"), 950);
  assert.equal(parseMinorAmount("0", "Delivery"), 0);
});

test("checkout amount parsing rejects negative, malformed and unsafe values", () => {
  for (const value of ["-1", "1.234", "1,2,3", "1e3", "NaN", "90071992547409.92"]) {
    assert.throws(() => parseMinorAmount(value, "Amount"));
  }
});

test("VAT percentage parsing converts to integer basis points", () => {
  assert.equal(parseRateBasisPoints("23"), 2300);
  assert.equal(parseRateBasisPoints("13,5"), 1350);
  assert.equal(parseRateBasisPoints("0.01"), 1);
});

test("VAT percentage parsing rejects invalid values above one hundred percent", () => {
  for (const value of ["-1", "23.456", "100.01", "Infinity", "1e2"]) {
    assert.throws(() => parseRateBasisPoints(value));
  }
});

test("the import form maps verified customs lines to the Revenue low-value example", () => {
  const fields = {
    entryDate: "2026-11-20",
    dispatchTerritory: "outside_eu",
    dispatchTerritoryVerified: true,
    isBusinessToConsumer: true,
    isGift: false,
    checkoutTotal: "22.00",
    checkoutTotalVerified: true,
    intrinsicValue: "15.00",
    intrinsicValueVerified: true,
    customsValuesVerified: true,
    postImportCosts: "0",
    postImportCostsVerified: true,
    lowValueDutyTreatment: "applicable",
    vatRate: "23",
    vatRateVerified: true,
    importVatAtCheckout: "",
    carrierAdministrationFee: "10.00",
    customsDutyTreatment: "additional_on_delivery",
    unionHandlingFeeTreatment: "additional_on_delivery",
    importVatTreatment: "additional_on_delivery",
    carrierAdministrationTreatment: "additional_on_delivery"
  };
  const line = (name, value) => ({
    distinctItemKey: name,
    tariffCode: "8471.30",
    quantity: "1",
    customsValue: value,
    classificationVerified: true,
    originVerified: true,
    additionalTaxes: "0",
    additionalTaxesVerified: true
  });
  const input = parseIrishImportFields(fields, [line("Notebook", "15.00"), line("Pen", "7.00")]);
  const result = calculateIrishImportCharges(input);
  assert.equal(result.exact, true, result.gaps.join("; "));
  assert.equal(result.customsDutyMinor, 600);
  assert.equal(result.unionHandlingFeeMinor, 400);
  assert.equal(result.importVatMinor, 736);
  assert.equal(result.consumerTotalMinor, 4936);
});

test("an unverified seller pass-through or customs value keeps the import total unavailable", () => {
  const fields = {
    entryDate: "2026-11-20",
    dispatchTerritory: "outside_eu",
    dispatchTerritoryVerified: true,
    isBusinessToConsumer: true,
    checkoutTotal: "100",
    checkoutTotalVerified: true,
    intrinsicValue: "90",
    intrinsicValueVerified: true,
    customsValuesVerified: false,
    postImportCosts: "0",
    postImportCostsVerified: true,
    lowValueDutyTreatment: "applicable",
    vatRate: "23",
    vatRateVerified: true,
    carrierAdministrationFee: "0",
    customsDutyTreatment: "additional_on_delivery",
    unionHandlingFeeTreatment: "unknown",
    importVatTreatment: "additional_on_delivery",
    carrierAdministrationTreatment: "not_applicable"
  };
  const input = parseIrishImportFields(fields, [{
    distinctItemKey: "graphics card",
    tariffCode: "8473.30",
    quantity: "1",
    customsValue: "90",
    classificationVerified: true,
    originVerified: true,
    additionalTaxes: "0",
    additionalTaxesVerified: true
  }]);
  const result = calculateIrishImportCharges(input);
  assert.equal(result.exact, false);
  assert.equal(result.consumerTotalMinor, null);
  assert.ok(result.gaps.some(gap => gap.includes("Union Handling Fee consumer charge treatment is unknown")));
  assert.ok(result.gaps.some(gap => gap.includes("customs values, including freight")));
});

test("cost-check page exposes evidence controls, current Revenue references and the local import scenario form", async () => {
  const [page, script] = await Promise.all([read("cost-check.html"), read("cost-check.js")]);
  assert.match(page, /cost-items/);
  assert.match(page, /cost-shipping/);
  assert.match(page, /cost-other/);
  assert.match(page, /cost-price-basis/);
  assert.match(page, /checkout-evidence/);
  assert.match(page, /id="import-cost-form"/);
  assert.match(page, /id="import-customs-lines"/);
  assert.match(page, /Verified as applicable/);
  assert.match(page, /It does not look up tariff rates, customs territory, or seller terms/);
  assert.match(page, /nothing is fetched or saved/i);
  assert.match(page, /revenue\.ie\/en\/customs\/individuals\/relief-low-value-consignments/);
  assert.match(page, /revenue\.ie\/en\/customs\/individuals\/union-handling-fee/);
  assert.match(script, /calculateIrishCheckoutTotal/);
  assert.doesNotMatch(script, /\bfetch\s*\(|localStorage/);
});

test("home, component, deal and guide pages link to the checkout checker", async () => {
  const pages = await Promise.all([read("index.html"), read("components.html"), read("deals.html"), read("guides.html")]);
  for (const page of pages) assert.match(page, /href="cost-check\.html"/);
});

