import test from "node:test";
import assert from "node:assert/strict";
import { calculateShipping, cheapestItemPlan, optimizeBasket } from "../optimizer.js";

const rules = {
  a: { rate: 9, freeOver: 350 },
  b: { rate: 7, perItem: true }
};
const components = [{ id: "cpu" }, { id: "board" }, { id: "memory" }];
const offers = [
  { id: "a-cpu", componentId: "cpu", retailerId: "a", price: 195, available: true },
  { id: "b-cpu", componentId: "cpu", retailerId: "b", price: 190, available: true },
  { id: "a-board", componentId: "board", retailerId: "a", price: 120, available: true },
  { id: "b-board", componentId: "board", retailerId: "b", price: 115, available: true },
  { id: "a-memory", componentId: "memory", retailerId: "a", price: 85, available: true },
  { id: "b-memory", componentId: "memory", retailerId: "b", price: 83, available: true }
];

test("delivery is charged once per retailer order and free shipping hits the boundary", () => {
  const lineItems = [
    { retailerId: "a", price: 195 },
    { retailerId: "a", price: 120 },
    { retailerId: "a", price: 35 },
    { retailerId: "b", price: 10 },
    { retailerId: "b", price: 15 }
  ];
  assert.deepEqual(calculateShipping(lineItems, rules), [
    { retailerId: "a", subtotal: 350, itemCount: 3, cost: 0, free: true },
    { retailerId: "b", subtotal: 25, itemCount: 2, cost: 14, free: false }
  ]);
});

test("whole-basket optimum can differ from cheapest unit listings", () => {
  const best = optimizeBasket({ components, offers, shippingRules: rules });
  const itemBest = cheapestItemPlan({ components, offers, shippingRules: rules });
  assert.equal(best.exact, true);
  assert.equal(best.total, 400);
  assert.deepEqual(best.retailers, ["a"]);
  assert.equal(itemBest.partsSubtotal, 388);
  assert.equal(itemBest.total, 409);
  assert.ok(best.total < itemBest.total);
});

test("fewest-shop strategy minimises retailer orders before total price", () => {
  const expanded = offers.map(offer =>
    offer.id === "b-board" || offer.id === "b-memory" ? { ...offer, price: 300 } : offer
  );
  expanded.push({ id: "b-cpu-deal", componentId: "cpu", retailerId: "b", price: 1, available: true });
  const lowest = optimizeBasket({ components, offers: expanded, shippingRules: rules });
  const fewer = optimizeBasket({ components, offers: expanded, shippingRules: rules, strategy: "fewest" });
  assert.equal(lowest.total, 222);
  assert.deepEqual(lowest.retailers, ["a", "b"]);
  assert.deepEqual(fewer.retailers, ["a"]);
});

test("unavailable listings are excluded and missing categories fail clearly", () => {
  const notAvailable = offers.map(offer => offer.id === "a-cpu" ? { ...offer, available: false } : offer);
  const best = optimizeBasket({ components, offers: notAvailable, shippingRules: rules });
  assert.ok(best.selected.every(offer => offer.id !== "a-cpu"));
  assert.throws(() => optimizeBasket({ components: [{ id: "unknown" }], offers, shippingRules: rules }), /No eligible offers for unknown/);
});

test("unknown stock and offers without a known delivery rule are excluded", () => {
  assert.throws(() => optimizeBasket({
    components: [{ id: "cpu" }],
    offers: [{ id: "unknown-stock", componentId: "cpu", retailerId: "a", price: 1, available: "unknown" }],
    shippingRules: rules
  }), /No eligible offers for cpu/);
  assert.throws(() => optimizeBasket({
    components: [{ id: "cpu" }],
    offers: [{ id: "unknown-delivery", componentId: "cpu", retailerId: "unknown", price: 1, available: true }],
    shippingRules: rules
  }), /No eligible offers for cpu/);
});

test("exact enumeration checks every offer combination", () => {
  const best = optimizeBasket({ components, offers, shippingRules: rules });
  assert.equal(best.combinationsChecked, 8);
});

test("exact result matches an independent exhaustive reference", () => {
  const referenceTotals = [];
  for (const cpu of offers.filter(offer => offer.componentId === "cpu")) {
    for (const board of offers.filter(offer => offer.componentId === "board")) {
      for (const memory of offers.filter(offer => offer.componentId === "memory")) {
        const selected = [cpu, board, memory];
        const delivery = calculateShipping(selected, rules).reduce((sum, order) => sum + order.cost, 0);
        referenceTotals.push(selected.reduce((sum, offer) => sum + offer.price, 0) + delivery);
      }
    }
  }
  const result = optimizeBasket({ components, offers, shippingRules: rules });
  assert.equal(result.total, Math.min(...referenceTotals));
});

test("a bundle competes with separate component offers in the exact search", () => {
  const bundles = [{
    id: "a-core-bundle",
    retailerId: "a",
    covers: ["cpu", "board"],
    price: 295,
    available: true
  }];
  const result = optimizeBasket({ components, offers, bundles, shippingRules: rules });
  assert.equal(result.exact, true);
  assert.equal(result.total, 380);
  assert.deepEqual(result.bundles.map(bundle => bundle.id), ["a-core-bundle"]);
  assert.equal(Object.keys(result.assignments).length, components.length);
  assert.equal(result.assignments.cpu.bundleId, "a-core-bundle");
  assert.equal(result.assignments.board.bundleId, "a-core-bundle");
  assert.equal(result.assignments.memory.type, "offer");
});

test("bundle shipping threshold counts the bundle as one order line and covers each part once", () => {
  const result = optimizeBasket({
    components: [{ id: "cpu" }, { id: "board" }, { id: "memory" }],
    offers: [
      { id: "a-cpu", componentId: "cpu", retailerId: "a", price: 200, available: true },
      { id: "a-board", componentId: "board", retailerId: "a", price: 200, available: true },
      { id: "a-memory", componentId: "memory", retailerId: "a", price: 10, available: true }
    ],
    bundles: [{ id: "a-core-bundle", retailerId: "a", covers: ["cpu", "board"], price: 345, available: true }],
    shippingRules: rules
  });
  const order = result.orders.find(item => item.retailerId === "a");
  assert.equal(order.subtotal, 355);
  assert.equal(order.itemCount, 2);
  assert.equal(order.cost, 0);
  assert.equal(Object.keys(result.assignments).length, 3);
  assert.equal(new Set(Object.keys(result.assignments)).size, 3);
});

test("overlapping bundles cannot cover a selected component twice", () => {
  const result = optimizeBasket({
    components,
    offers,
    bundles: [
      { id: "a-cpu-board", retailerId: "a", covers: ["cpu", "board"], price: 290, available: true },
      { id: "a-board-memory", retailerId: "a", covers: ["board", "memory"], price: 150, available: true }
    ],
    shippingRules: rules
  });
  assert.ok(result.bundles.length <= 1);
  assert.equal(Object.keys(result.assignments).length, components.length);
});

test("component locks and retailer exclusions are respected by offers and bundles", () => {
  const result = optimizeBasket({
    components,
    offers,
    bundles: [{ id: "a-core-bundle", retailerId: "a", covers: ["cpu", "board"], price: 1, available: true }],
    shippingRules: rules,
    excludedRetailerIds: ["a"],
    locks: { cpu: "b" }
  });
  assert.ok(result.selected.every(offer => offer.retailerId === "b"));
  assert.equal(result.bundles.length, 0);
  assert.equal(result.assignments.cpu.retailerId, "b");
});

test("bundle references must only cover selected unique components", () => {
  assert.throws(() => optimizeBasket({
    components,
    offers,
    bundles: [{ id: "invalid", retailerId: "a", covers: ["cpu", "unknown"], price: 1, available: true }],
    shippingRules: rules
  }), /covers an unselected component/);
  assert.throws(() => optimizeBasket({
    components,
    offers,
    bundles: [{ id: "duplicate", retailerId: "a", covers: ["cpu", "cpu"], price: 1, available: true }],
    shippingRules: rules
  }), /lists a component more than once/);
});

test("bundle optimisation matches an independent small exhaustive reference", () => {
  const bundles = [
    { id: "a-core", retailerId: "a", covers: ["cpu", "board"], price: 295, available: true },
    { id: "b-core", retailerId: "b", covers: ["cpu", "board"], price: 280, available: true },
    { id: "a-board-memory", retailerId: "a", covers: ["board", "memory"], price: 170, available: true }
  ];
  const result = optimizeBasket({ components, offers, bundles, shippingRules: rules });
  let referenceTotal = Infinity;

  for (let mask = 0; mask < 2 ** bundles.length; mask += 1) {
    const chosenBundles = bundles.filter((_, index) => mask & (1 << index));
    const covered = new Set();
    let valid = true;
    for (const bundle of chosenBundles) {
      if (bundle.covers.some(id => covered.has(id))) {
        valid = false;
        break;
      }
      bundle.covers.forEach(id => covered.add(id));
    }
    if (!valid) continue;

    const remaining = components.filter(component => !covered.has(component.id));
    function enumerateOffers(index, selected) {
      if (index === remaining.length) {
        const lines = [...selected, ...chosenBundles.map(bundle => ({ ...bundle, componentId: bundle.covers.join("+") }))];
        const delivery = calculateShipping(lines, rules).reduce((sum, order) => sum + order.cost, 0);
        const parts = lines.reduce((sum, line) => sum + line.price, 0);
        referenceTotal = Math.min(referenceTotal, parts + delivery);
        return;
      }
      const componentId = remaining[index].id;
      for (const offer of offers.filter(item => item.componentId === componentId && item.available === true)) {
        enumerateOffers(index + 1, [...selected, offer]);
      }
    }
    enumerateOffers(0, []);
  }
  assert.equal(result.total, referenceTotal);
});

