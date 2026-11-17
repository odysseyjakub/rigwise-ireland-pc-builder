import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BUNDLES, COUNTIES } from "../data.js";

test("county picker includes every unique Republic of Ireland county", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const select = html.match(/<select id="county"[^>]*>([\s\S]*?)<\/select>/);
  assert.ok(select, "county selector exists");
  const options = [...select[1].matchAll(/<option(?: selected)?>([^<]+)<\/option>/g)].map(match => match[1]);
  assert.equal(COUNTIES.length, 26);
  assert.equal(new Set(COUNTIES).size, 26);
  assert.deepEqual(options, COUNTIES);
});

test("the displayed bundle fixtures carry an explicit synthetic-data marker", () => {
  assert.ok(BUNDLES.length > 0);
  assert.ok(BUNDLES.every(bundle => bundle.evidence === "synthetic-demo-fixture"));
});

