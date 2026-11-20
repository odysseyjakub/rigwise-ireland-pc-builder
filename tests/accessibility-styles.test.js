import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [mainCss, catalogueCss, legalCss] = await Promise.all([
  readFile(new URL("../styles.css", import.meta.url), "utf8"),
  readFile(new URL("../components.css", import.meta.url), "utf8"),
  readFile(new URL("../legal.css", import.meta.url), "utf8")
]);

test("builder labels, selectors, prices, and comparison values keep readable type sizes", () => {
  assert.match(mainCss, /body\s*\{\s*font-size:\s*16px;/);
  assert.match(mainCss, /\.control-block>label\s*\{\s*font-size:\s*14px;/);
  assert.match(mainCss, /\.part-info strong\s*\{\s*font-size:\s*14px;/);
  assert.match(mainCss, /\.part-select\s*\{\s*font-size:\s*14px;/);
  assert.match(mainCss, /\.comparison-table td\s*\{\s*font-size:\s*14px;/);
});

test("mobile component rows give controls their own readable grid row", () => {
  assert.match(mainCss, /@media\s*\(max-width:\s*740px\)[\s\S]*?grid-template-areas:\s*"icon info price"\s*"icon select compare"/);
  assert.match(mainCss, /\.part-select\s*\{\s*grid-area:\s*select;\s*height:\s*40px;/);
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
