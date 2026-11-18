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

test("deals page clearly states that no current verified offers are connected", async () => {
  const deals = await read("deals.html");
  assert.match(deals, /NO VERIFIED OFFERS/);
  assert.match(deals, /no current offers to publish/i);
  assert.match(deals, /test fixtures/i);
  assert.match(deals, /Ireland delivery evidence/i);
  assert.doesNotMatch(deals, /€\s*\d+(?:\.\d{2})?\s*(?:off|deal)/i);
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

