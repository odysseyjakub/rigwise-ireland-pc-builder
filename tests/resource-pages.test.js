import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = name => readFile(new URL(`../${name}`, import.meta.url), "utf8");

test("builder and catalogue navigation link to the deals and guide pages", async () => {
  const [home, catalogue] = await Promise.all([read("index.html"), read("components.html")]);
  for (const page of [home, catalogue]) {
    assert.match(page, /href="deals\.html"/);
    assert.match(page, /href="guides\.html"/);
  }
});

test("primary navigation exposes saved builds and the browser-local account", async () => {
  const pages = await Promise.all(["index.html", "components.html", "deals.html", "guides.html", "cost-check.html"].map(read));
  for (const page of pages) {
    assert.match(page, /Saved Builds/);
    assert.match(page, /href="(?:index\.html)?#saved-builds"/);
    assert.match(page, /href="(?:index\.html)?#account"/);
  }
  const home = await read("index.html");
  const app = await read("app.js");
  assert.match(home, /id="saved-builds" class="saved-builds"/);
  assert.match(app, /No builds saved yet/);
  assert.match(app, /escapeHTML\(item\.id\)/);
});

test("mapped shop candidates offer an on-demand OpenStreetMap preview with a visible evidence boundary", async () => {
  const [home, app, map] = await Promise.all([read("index.html"), read("app.js"), read("shop-map.js")]);
  assert.match(home, /id="local-shop-map" class="local-shop-map" hidden/);
  assert.match(home, /id="local-shop-map-frame"[^>]*loading="lazy"/);
  assert.match(home, /map preview connects to OpenStreetMap only when you choose it/);
  assert.match(app, /data-shop-map/);
  assert.match(app, /closeShopMapPreview\(\)/);
  assert.match(map, /https:\/\/www\.openstreetmap\.org\/export\/embed\.html/);
  assert.match(map, /IRELAND_BOUNDS/);
});

test("deals page clearly states that no current verified offers are connected", async () => {
  const deals = await read("deals.html");
  assert.match(deals, /NO VERIFIED OFFERS/);
  assert.match(deals, /no current offers to publish/i);
  assert.match(deals, /test fixtures/i);
  assert.match(deals, /Ireland delivery evidence/i);
  assert.doesNotMatch(deals, /€\s*\d+(?:\.\d{2})?\s*(?:off|deal)/i);
});

test("deals page explains public-source access and licensing boundaries", async () => {
  const deals = await read("deals.html");
  assert.match(deals, /PUBLIC DATA OPTIONS REVIEWED/);
  assert.match(deals, /comparison-use permission/);
  assert.match(deals, /has not imported or accepted that licence/);
  assert.match(deals, /prior written consent/);
  assert.match(deals, /not exhaustive/);
  assert.match(deals, /secret Publisher Center JWT/);
  assert.match(deals, /does not provide a public search/);
  assert.match(deals, /start at €99\/month/);
  for (const source of ["help.awin.com", "docs.kelkoogroup.com", "icecat.com", "affiliate-program.amazon.com", "developer.ebay.com", "developers.google.com/merchant/api", "priceapi.com"]) {
    assert.ok(deals.includes(source), `Missing official source link for ${source}`);
  }
});

test("guide links to the same manufacturer sources as the reference catalogue", async () => {
  const [guide, catalogue] = await Promise.all([read("guides.html"), read("catalogue-data.js")]);
  const sourceUrls = [...catalogue.matchAll(/sourceUrl: "([^"]+)"/g)].map(match => match[1]);
  for (const url of sourceUrls) assert.ok(guide.includes(url), `Missing manufacturer source in guide: ${url}`);
  assert.match(guide, /JEDEC default is 4800 MT\/s/);
  assert.match(guide, /synthetic sample data/);
  assert.match(guide, /Republic of Ireland/);
});

test("resource pages share the saved browser theme preference", async () => {
  const [deals, guide, script, css] = await Promise.all([
    read("deals.html"), read("guides.html"), read("resource-page.js"), read("resources.css")
  ]);
  for (const page of [deals, guide]) {
    assert.match(page, /class="[^"]*theme-toggle[^"]*"/);
    assert.match(page, /resource-page\.js/);
    assert.match(page, /aria-label="Switch to dark theme"/);
  }
  assert.match(script, /rigwise-theme/);
  assert.match(script, /Switch to light theme/);
  assert.match(css, /@media \(max-width: 740px\)/);
  assert.match(css, /\.dark-theme\.resource-page/);
});

