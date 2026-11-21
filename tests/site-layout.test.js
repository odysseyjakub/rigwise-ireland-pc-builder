import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const [home, builder, app, resourceCss, componentCss, privacy] = await Promise.all([
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../builder.html", import.meta.url), "utf8"),
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../resources.css", import.meta.url), "utf8"),
  readFile(new URL("../components.css", import.meta.url), "utf8"),
  readFile(new URL("../privacy.html", import.meta.url), "utf8")
]);

test("homepage is a single photo-led route into the questionnaire", async () => {
  assert.match(home, /assets\/rigwise-home-pc\.jpg/);
  assert.match(home, /href="build-quiz\.html"[^>]*>Start building/);
  assert.match(home, /sdl sanjaya on Unsplash/);
  assert.doesNotMatch(home, /home-process|hero-art|hero-note/);
  assert.ok((await stat(new URL("../assets/rigwise-home-pc.jpg", import.meta.url))).size > 100_000);
});

test("builder keeps its quick summary visible and detailed totals collapsed", () => {
  assert.match(builder, /id="setup-summary"/);
  assert.match(builder, /<details class="plan-breakdown">/);
  assert.match(builder, /<details id="fps-estimates"/);
  assert.match(builder, /id="share-build"/);
  assert.doesNotMatch(builder, /<details class="plan-breakdown" open/);
});

test("part options expose model specs, compatibility and keyboard-friendly radio choices", () => {
  assert.match(app, /type="radio" id="option-/);
  assert.match(app, /option\.detail \|\| "Specifications not recorded"/);
  assert.match(app, /compatibilitySummaryForProduct\(option\)/);
  assert.match(app, /document\.getElementById\(focusedOption\)\?\.focus/);
  assert.match(resourceCss, /\.part-option:focus-within/);
});

test("mobile navigation stays on one row and image requests are disclosed", () => {
  assert.match(resourceCss, /@media \(max-width: 740px\)[\s\S]*?\.resource-page \.main-nav[\s\S]*?flex-wrap: nowrap/);
  assert.match(resourceCss, /\.main-nav > a\[href="index\.html"\]/);
  assert.match(componentCss, /\.components-page \.component-header \.main-nav[\s\S]*?flex-wrap: nowrap/);
  assert.match(privacy, /AMD, Multitronic and TechPowerUp/);
  assert.match(privacy, /homepage photograph is stored locally/);
});

