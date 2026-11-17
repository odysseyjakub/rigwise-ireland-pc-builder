import test from "node:test";
import assert from "node:assert/strict";
import { checkCompatibility } from "../compatibility.js";
import { COMPONENTS, DEFAULT_BUILD, PRODUCTS } from "../data.js";

function check(overrides = {}) {
  const build = { ...DEFAULT_BUILD, ...overrides };
  return checkCompatibility({
    components: COMPONENTS.map(component => ({ ...component, productId: build[component.id] })),
    products: PRODUCTS
  });
}

test("default example build passes the demo compatibility checks", () => {
  assert.deepEqual(check(), []);
});

test("detects a mismatched CPU socket", () => {
  assert.ok(check({ cpu: "cpu-am4" }).some(issue => issue.title === "Processor socket mismatch"));
});

test("detects unsupported memory generation", () => {
  assert.ok(check({ memory: "ram-16-ddr4" }).some(issue => issue.title === "Memory generation mismatch"));
});

test("detects motherboard form factor and graphics clearance issues", () => {
  const issues = check({ motherboard: "board-b650-atx", case: "case-air", graphics: "gpu-performance" });
  assert.ok(issues.some(issue => issue.title === "Motherboard does not fit"));
  assert.ok(issues.some(issue => issue.title === "Graphics card clearance"));
});

test("checks cooler socket and capacity and recommends PSU headroom", () => {
  const socket = check({ cooler: "cooler-am4" });
  assert.ok(socket.some(issue => issue.title === "Cooler mounting mismatch"));
  const power = check({ cpu: "cpu-8", cooler: "cooler-am5", graphics: "gpu-performance", power: "psu-550" });
  assert.ok(power.some(issue => issue.title === "Check power headroom"));
});
