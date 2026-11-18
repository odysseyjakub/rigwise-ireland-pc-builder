import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseMinorAmount, parseRateBasisPoints } from "../cost-check-input.js";

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

test("cost-check page exposes evidence controls, current Revenue references and outside-EU limits", async () => {
  const [page, script] = await Promise.all([read("cost-check.html"), read("cost-check.js")]);
  assert.match(page, /cost-items/);
  assert.match(page, /cost-shipping/);
  assert.match(page, /cost-other/);
  assert.match(page, /cost-price-basis/);
  assert.match(page, /checkout-evidence/);
  assert.match(page, /does not calculate outside-EU landed charges/);
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

