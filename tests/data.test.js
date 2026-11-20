import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BUNDLES, COUNTIES } from "../data.js";

test("county picker includes every unique Republic of Ireland county", () => {
  const html = readFileSync(new URL("../local-shops.html", import.meta.url), "utf8");
  const script = readFileSync(new URL("../local-shops-page.js", import.meta.url), "utf8");
  const select = html.match(/<select id="county"[^>]*><\/select>/);
  assert.ok(select, "county selector exists");
  assert.match(script, /for \(const county of COUNTIES\)/);
  assert.match(script, /option\.textContent = county/);
  assert.equal(COUNTIES.length, 26);
  assert.equal(new Set(COUNTIES).size, 26);
});

test("the displayed bundle fixtures carry an explicit synthetic-data marker", () => {
  assert.ok(BUNDLES.length > 0);
  assert.ok(BUNDLES.every(bundle => bundle.evidence === "synthetic-demo-fixture"));
});
