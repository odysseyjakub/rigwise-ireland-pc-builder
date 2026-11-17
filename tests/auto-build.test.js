import test from "node:test";
import assert from "node:assert/strict";
import { generateAutoBuild } from "../auto-build.js";
import { BUNDLES, COMPONENTS, OFFERS, PRODUCTS, SHIPPING_RULES } from "../data.js";

function generate(budget, workload = "gaming") {
  return generateAutoBuild({
    budget,
    workload,
    components: COMPONENTS,
    products: PRODUCTS,
    offers: OFFERS,
    bundles: BUNDLES,
    shippingRules: SHIPPING_RULES
  });
}

test("auto build finds a complete compatible sample configuration within budget", () => {
  const result = generate(700, "gaming");
  assert.equal(result.status, "ready");
  assert.ok(result.plan.total <= 700);
  assert.equal(result.compatibility.incompatibleCount, 0);
  assert.equal(result.plan.exact, true);
  assert.equal(Object.keys(result.build).length, COMPONENTS.length);
  assert.ok(result.withinBudgetBuilds > 0);
});

test("auto build workload ranking responds to the selected use case", () => {
  const gaming = generate(1000, "gaming");
  const creative = generate(1000, "creative");
  assert.equal(gaming.status, "ready");
  assert.equal(creative.status, "ready");
  assert.notDeepEqual(gaming.build, creative.build);
  assert.ok(gaming.plan.total <= 1000);
  assert.ok(creative.plan.total <= 1000);
});

test("auto build reports when the compatible sample catalogue exceeds the budget", () => {
  const result = generate(1, "everyday");
  assert.equal(result.status, "no-budget-fit");
  assert.equal(result.plan, undefined);
  assert.ok(result.minimumCompatibleTotal > 1);
  assert.ok(result.minimumCompatibleBuild);
});

test("auto build validates its budget, workload, and source collections", () => {
  assert.throws(() => generate(-1), /non-negative EUR amount/);
  assert.throws(() => generate(1000, "streaming"), /supported workload/);
  assert.throws(() => generateAutoBuild({ budget: 1000, workload: "gaming" }), /must be arrays/);
});

