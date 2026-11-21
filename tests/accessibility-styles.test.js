import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [mainCss, resourceCss, catalogueCss, legalCss] = await Promise.all([
  readFile(new URL("../styles.css", import.meta.url), "utf8"),
  readFile(new URL("../resources.css", import.meta.url), "utf8"),
  readFile(new URL("../components.css", import.meta.url), "utf8"),
  readFile(new URL("../legal.css", import.meta.url), "utf8")
]);

test("builder labels, selectors, prices, and comparison values keep readable type sizes", () => {
  assert.match(mainCss, /body\s*\{\s*font-size:\s*16px;/);
  assert.match(mainCss, /\.control-block>label\s*\{\s*font-size:\s*14px;/);
  assert.match(resourceCss, /\.builder-workspace \.part-info strong\s*\{[^}]*font-size:\s*14px;/);
  assert.match(resourceCss, /\.part-option-name\s*\{[^}]*font-size:\s*14px;/);
  assert.match(resourceCss, /\.part-option-specs\s*\{[^}]*font-size:\s*12px;/);
  assert.match(resourceCss, /\.part-option-compat\s*\{[^}]*font-size:\s*12px;/);
  assert.match(mainCss, /\.comparison-table td\s*\{\s*font-size:\s*14px;/);
});

test("mobile component choices stack into readable cards with a visible focus state", () => {
  assert.match(resourceCss, /@media\s*\(max-width:\s*520px\)[\s\S]*?\.part-options\s*\{\s*grid-template-columns:\s*1fr;/);
  assert.match(resourceCss, /\.part-option:focus-within\s*\{\s*outline:\s*2px solid/);
});

test("manufacturer specifications and legal copy keep readable type sizes", () => {
  assert.match(catalogueCss, /\.catalogue-specs\s*\{\s*font-size:\s*14px;/);
  assert.match(legalCss, /\.legal-article p, \.legal-article li\s*\{[^}]*font-size:\s*16px;/);
});

test("manufacturer comparison controls reflow and the table scrolls at narrow widths", () => {
  assert.match(catalogueCss, /\.manufacturer-comparison-results\s*\{[^}]*overflow-x:\s*auto;/);
  assert.match(catalogueCss, /@media\s*\(max-width:\s*900px\)[\s\S]*?\.manufacturer-compare-controls\s*\{[^}]*grid-template-columns:\s*repeat\(2/);
  assert.match(catalogueCss, /@media\s*\(max-width:\s*640px\)[\s\S]*?\.manufacturer-compare-controls\s*\{[^}]*grid-template-columns:\s*1fr/);
});

test("source-linked build selectors reflow for tablet and mobile", () => {
  assert.match(catalogueCss, /\.reference-build-controls\s*\{[^}]*grid-template-columns:\s*repeat\(4/);
  assert.match(catalogueCss, /@media\s*\(max-width:\s*900px\)[\s\S]*?\.reference-build-controls\s*\{[^}]*grid-template-columns:\s*repeat\(2/);
  assert.match(catalogueCss, /@media\s*\(max-width:\s*640px\)[\s\S]*?\.reference-build-controls\s*\{[^}]*grid-template-columns:\s*1fr/);
});

