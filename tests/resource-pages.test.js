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
  const pages = await Promise.all(["index.html", "build-quiz.html", "builder.html", "saved-builds.html", "components.html", "deals.html", "guides.html", "cost-check.html", "local-shops.html"].map(read));
  for (const page of pages) {
    assert.match(page, /Saved builds/);
    assert.match(page, /href="saved-builds\.html"/);
    assert.match(page, /href="saved-builds\.html#local-account"/);
  }
  const [home, builder, savedPage, savedScript] = await Promise.all([read("index.html"), read("builder.html"), read("saved-builds.html"), read("saved-builds-page.js")]);
  const app = await read("app.js");
  assert.doesNotMatch(home, /id="builder"|id="saved-builds"/);
  assert.match(home, /href="build-quiz\.html"/);
  assert.match(builder, /id="save-build"/);
  assert.match(builder, /href="saved-builds\.html"/);
  assert.match(app, /Manage your builds/);
  assert.match(savedPage, /id="saved-builds-list"/);
  assert.match(savedPage, /saved-builds-page\.js/);
  assert.match(app, /function saveBuild\(/);
  assert.match(savedScript, /makeButton\("Copy link"/);
  assert.match(savedScript, /makeButton\("Rename"/);
  assert.match(savedScript, /makeButton\("Duplicate"/);
});

test("questionnaire groups essentials, accepts exact storage targets and keeps accessories last", async () => {
  const [quiz, script, state, app] = await Promise.all([read("build-quiz.html"), read("build-quiz.js"), read("build-quiz-state.js"), read("app.js")]);
  assert.match(quiz, /data-quiz-step="needs"/);
  assert.match(quiz, /data-quiz-step="performance"/);
  assert.match(quiz, /data-quiz-step="fit"/);
  assert.match(quiz, /data-quiz-step="strategy"/);
  assert.match(quiz, /data-quiz-step="creative-apps"/);
  for (const workload of ["gaming", "streaming", "creative", "3d", "everyday"]) {
    assert.match(quiz, new RegExp('name="workload" value="' + workload + '"'));
  }
  assert.match(quiz, /name="games" value="cyberpunk-2077"/);
  assert.match(quiz, /name="games" value="fortnite"/);
  assert.match(quiz, /name="apps" value="video"/);
  assert.match(quiz, /name="design" value="aesthetics"/);
  assert.match(quiz, /id="quiz-review"/);
  assert.match(quiz, /Adjust my answers/);
  assert.match(quiz, /Choose my parts/);
  assert.match(quiz, /name="storageGb" type="number" min="256" max="8000"/);
  assert.match(quiz, /data-storage-gb="512"/);
  assert.match(quiz, /min="400" max="5500"/);
  assert.match(quiz, /Build my PC/);
  assert.match(script, /window\.location\.href = "builder\.html\?"/);
  assert.match(script, /visible\.every\(stepIsValid\)/);
  assert.match(script, /stepIsValid\(current\)/);
  assert.match(script, /minimumGoalBudget/);
  assert.match(script, /option\.disabled = budget < minimum/);
  assert.match(script, /selectedValues\("games"\)\.length > 0/);
  assert.match(script, /selectedValues\("apps"\)\.length > 0/);
  assert.match(script, /function showRecommendation\(/);
  assert.match(script, /document\.querySelector\("\.quiz-hero"\)\.hidden = true/);
  assert.match(script, /document\.querySelector\("\.quiz-hero"\)\.hidden = false/);
  assert.match(state, /source/);
  assert.match(app, /readQuizPreferences\(location\.search\)/);
  assert.match(app, /generateBuild\(\)/);
});

test("mapped shop candidates offer an on-demand OpenStreetMap preview with a visible evidence boundary", async () => {
  const [page, app, map] = await Promise.all([read("local-shops.html"), read("local-shops-page.js"), read("shop-map.js")]);
  assert.match(page, /id="local-shop-map" class="local-shop-map" hidden/);
  assert.match(page, /id="local-shop-map-frame"[^>]*loading="lazy"/);
  assert.match(page, /only after you request a lookup/);
  assert.match(app, /fetch\("\/api\/shops\?county="/);
  assert.match(app, /dataset\.shopMap/);
  assert.match(app, /function closeMap\(\)/);
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

