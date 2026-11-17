import test from "node:test";
import assert from "node:assert/strict";
import { calculateShipping, cheapestItemPlan, optimizeBasket } from "../optimizer.js";

const rules = {
  a: { rate: 9, freeOver: 350 },
  b: { rate: 7, perItem: true }
};
const components = [{ id: "cpu" }, { id: "board" }, { id: "memory" }];
const offers = [
  { id: "a-cpu", componentId: "cpu", retailerId: "a", price: 195 },
  { id: "b-cpu", componentId: "cpu", retailerId: "b", price: 190 },
  { id: "a-board", componentId: "board", retailerId: "a", price: 120 },
  { id: "b-board", componentId: "board", retailerId: "b", price: 115 },
  { id: "a-memory", componentId: "memory", retailerId: "a", price: 85 },
  { id: "b-memory", componentId: "memory", retailerId: "b", price: 83 }
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
  expanded.push({ id: "b-cpu-deal", componentId: "cpu", retailerId: "b", price: 1 });
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
