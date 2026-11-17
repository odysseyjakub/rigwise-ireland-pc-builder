function validPrice(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error("Invalid price for " + label);
}

export function calculateShipping(items, rules) {
  const grouped = new Map();
  for (const item of items) {
    const rule = rules[item.retailerId];
    if (!rule) throw new Error("Missing shipping rule for " + item.retailerId);
    validPrice(item.price, item.id || item.componentId || "order item");
    validPrice(rule.rate, "shipping rule for " + item.retailerId);
    const group = grouped.get(item.retailerId) ?? { retailerId: item.retailerId, subtotal: 0, count: 0, rule };
    group.subtotal += item.price;
    group.count += Number.isFinite(item.shippingUnits) && item.shippingUnits > 0 ? item.shippingUnits : 1;
    grouped.set(item.retailerId, group);
  }
  return [...grouped.values()].map(group => {
    const rule = group.rule;
    const free = Number.isFinite(rule.freeOver) && group.subtotal >= rule.freeOver;
    const cost = free ? 0 : (rule.perItem ? rule.rate * group.count : rule.rate);
    return { retailerId: group.retailerId, subtotal: group.subtotal, itemCount: group.count, cost, free };
  });
}

function score(plan, strategy) {
  const selection = [
    ...plan.selected.map(offer => offer.id),
    ...plan.bundles.map(bundle => bundle.id)
  ].sort().join("|");
  if (strategy === "fewest") return [plan.orders.length, plan.total, plan.retailers.join("|"), selection];
  return [plan.total, plan.orders.length, plan.retailers.join("|"), selection];
}

function isBetter(candidate, current, strategy) {
  if (!current) return true;
  const left = score(candidate, strategy);
  const right = score(current, strategy);
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] < right[index]) return true;
    if (left[index] > right[index]) return false;
  }
  return false;
}

function evaluateOrderCosts(orders, items, evaluator) {
  if (typeof evaluator !== "function") return { exact: true, orders, additionalMinor: 0, breakdown: [] };
  const evaluatedOrders = [];
  const breakdown = [];
  let additionalMinor = 0;
  for (const order of orders) {
    const orderItems = items.filter(item => item.retailerId === order.retailerId);
    let result;
    try {
      result = evaluator({
        retailerId: order.retailerId,
        items: orderItems,
        subtotalMinor: Math.round(order.subtotal * 100),
        shippingMinor: Math.round(order.cost * 100),
        shipping: order
      });
    } catch (error) {
      return { exact: false, reason: error instanceof Error ? error.message : String(error) };
    }
    if (!result || result.status !== "exact" || result.currency !== "EUR" ||
        !Number.isSafeInteger(result.consumerAdditionalMinor) || result.consumerAdditionalMinor < 0) {
      const gaps = Array.isArray(result?.gaps) ? result.gaps : [];
      return {
        exact: false,
        reason: gaps.length ? gaps.join("; ") : "retailer order costs are not verified for " + order.retailerId
      };
    }
    additionalMinor += result.consumerAdditionalMinor;
    if (!Number.isSafeInteger(additionalMinor)) return { exact: false, reason: "retailer order costs exceed the safe integer range" };
    const detail = {
      retailerId: order.retailerId,
      consumerAdditionalMinor: result.consumerAdditionalMinor,
      breakdown: result.breakdown ?? null
    };
    breakdown.push(detail);
    evaluatedOrders.push({
      ...order,
      consumerAdditionalMinor: result.consumerAdditionalMinor,
      consumerAdditional: result.consumerAdditionalMinor / 100,
      orderCostBreakdown: detail.breakdown
    });
  }
  return { exact: true, orders: evaluatedOrders, additionalMinor, breakdown };
}

function normalizeBundle(bundle, requiredComponentIds, catalogComponentIds) {
  if (!bundle || typeof bundle.id !== "string" || typeof bundle.retailerId !== "string") {
    throw new Error("Each bundle needs an id and retailerId");
  }
  validPrice(bundle.price, bundle.id);
  if (!Array.isArray(bundle.covers) || bundle.covers.length === 0) {
    throw new Error("Bundle " + bundle.id + " must cover at least one component");
  }
  if (new Set(bundle.covers).size !== bundle.covers.length) {
    throw new Error("Bundle " + bundle.id + " lists a component more than once");
  }
  for (const componentId of bundle.covers) {
    if (!catalogComponentIds.has(componentId)) {
      throw new Error("Bundle " + bundle.id + " covers an unknown component: " + componentId);
    }
  }
  return bundle.covers.every(componentId => requiredComponentIds.has(componentId)) ? bundle : null;
}

function lockAllows(lock, candidate) {
  if (!lock) return true;
  if (typeof lock === "string") return lock === candidate.retailerId;
  if (lock.offerId) return candidate.kind === "offer" && lock.offerId === candidate.id;
  if (lock.bundleId) return candidate.kind === "bundle" && lock.bundleId === candidate.id;
  if (lock.retailerId) return lock.retailerId === candidate.retailerId;
  return false;
}

export function optimizeBasket({
  components,
  offers,
  shippingRules,
  bundles = [],
  catalogComponentIds: knownComponentIds = [],
  locks = {},
  excludedRetailerIds = [],
  strategy = "lowest",
  orderCostEvaluator
}) {
  if (!Array.isArray(components) || !Array.isArray(offers) || !Array.isArray(bundles)) {
    throw new Error("Components, offers, and bundles must be arrays");
  }
  if (strategy !== "lowest" && strategy !== "fewest") throw new Error("Unknown optimisation strategy: " + strategy);

  const componentIds = components.map(component => component.id);
  if (new Set(componentIds).size !== componentIds.length) throw new Error("Component ids must be unique");
  const required = new Set(componentIds);
  const catalog = new Set([...componentIds, ...knownComponentIds]);
  const excluded = new Set(excludedRetailerIds);
  const validBundles = bundles
    .filter(bundle => bundle.available === true && !excluded.has(bundle.retailerId) && Boolean(shippingRules[bundle.retailerId]))
    .map(bundle => normalizeBundle(bundle, required, catalog))
    .filter(Boolean);
  const availableOffers = offers.filter(offer => offer.available === true && !excluded.has(offer.retailerId) && Boolean(shippingRules[offer.retailerId]));
  availableOffers.forEach(offer => validPrice(offer.price, offer.id || offer.componentId || "offer"));

  const individualChoices = new Map();
  for (const componentId of componentIds) {
    const lock = locks[componentId];
    const choices = availableOffers
      .filter(offer => offer.componentId === componentId && lockAllows(lock, { ...offer, kind: "offer" }));
    individualChoices.set(componentId, choices);
    const hasBundleChoice = validBundles.some(bundle =>
      bundle.covers.includes(componentId) && bundle.covers.every(coveredId => {
        const coveredLock = locks[coveredId];
        return lockAllows(coveredLock, { ...bundle, kind: "bundle" });
      })
    );
    if (choices.length === 0 && !hasBundleChoice) throw new Error("No eligible offers for " + componentId);
  }

  let best = null;
  let combinationsChecked = 0;
  let combinationsRejectedByCost = 0;
  const costRejectionReasons = new Set();
  function visit(uncovered, selected, selectedBundles, assignments) {
    if (uncovered.size === 0) {
      combinationsChecked += 1;
      const bundleLines = selectedBundles.map(bundle => ({
        id: bundle.id,
        retailerId: bundle.retailerId,
        price: bundle.price,
        shippingUnits: Number.isFinite(bundle.shippingUnits) ? bundle.shippingUnits : 1,
        kind: "bundle"
      }));
      const purchaseLines = [...selected, ...bundleLines];
      const orders = calculateShipping(purchaseLines, shippingRules);
      const partsSubtotal = selected.reduce((sum, item) => sum + item.price, 0)
        + selectedBundles.reduce((sum, bundle) => sum + bundle.price, 0);
      const deliveryTotal = orders.reduce((sum, order) => sum + order.cost, 0);
      const orderCosts = evaluateOrderCosts(orders, purchaseLines, orderCostEvaluator);
      if (!orderCosts.exact) {
        combinationsRejectedByCost += 1;
        if (orderCosts.reason) costRejectionReasons.add(orderCosts.reason);
        return;
      }
      const candidate = {
        selected: [...selected],
        bundles: [...selectedBundles],
        assignments: Object.fromEntries(assignments),
        orders: orderCosts.orders,
        partsSubtotal,
        deliveryTotal,
        orderCostMinor: orderCosts.additionalMinor,
        orderCostBreakdown: orderCosts.breakdown,
        total: partsSubtotal + deliveryTotal + orderCosts.additionalMinor / 100,
        retailers: [...new Set([...selected.map(item => item.retailerId), ...selectedBundles.map(bundle => bundle.retailerId)])].sort(),
        combinationsChecked,
        exact: true
      };
      if (isBetter(candidate, best, strategy)) best = candidate;
      return;
    }

    const componentId = componentIds.find(id => uncovered.has(id));
    for (const offer of individualChoices.get(componentId)) {
      selected.push(offer);
      assignments.set(componentId, { type: "offer", offerId: offer.id, retailerId: offer.retailerId });
      const next = new Set(uncovered);
      next.delete(componentId);
      visit(next, selected, selectedBundles, assignments);
      selected.pop();
      assignments.delete(componentId);
    }

    for (const bundle of validBundles) {
      if (!bundle.covers.includes(componentId) || !bundle.covers.every(id => uncovered.has(id))) continue;
      if (!bundle.covers.every(id => lockAllows(locks[id], { ...bundle, kind: "bundle" }))) continue;
      selectedBundles.push(bundle);
      for (const coveredId of bundle.covers) assignments.set(coveredId, { type: "bundle", bundleId: bundle.id, retailerId: bundle.retailerId });
      const next = new Set(uncovered);
      bundle.covers.forEach(id => next.delete(id));
      visit(next, selected, selectedBundles, assignments);
      selectedBundles.pop();
      bundle.covers.forEach(id => assignments.delete(id));
    }
  }

  visit(required, [], [], new Map());
  if (!best && combinationsChecked > 0 && orderCostEvaluator) {
    throw new Error("No complete basket has verified retailer order costs (" + combinationsRejectedByCost +
      " rejected: " + [...costRejectionReasons].slice(0, 3).join(" | ") + ")");
  }
  if (!best) throw new Error("No complete basket satisfies the selected locks and exclusions");
  best.combinationsChecked = combinationsChecked;
  best.combinationsRejectedByCost = combinationsRejectedByCost;
  return best;
}

export function cheapestItemPlan({ components, offers, shippingRules, orderCostEvaluator }) {
  const selected = components.map(component => {
    const candidates = offers
      .filter(offer => offer.componentId === component.id && offer.available === true && Boolean(shippingRules[offer.retailerId]))
      .sort((a, b) => a.price - b.price || a.retailerId.localeCompare(b.retailerId));
    if (candidates.length === 0) throw new Error("No eligible offers for " + component.id);
    return candidates[0];
  });
  const orders = calculateShipping(selected, shippingRules);
  const partsSubtotal = selected.reduce((sum, item) => sum + item.price, 0);
  const deliveryTotal = orders.reduce((sum, order) => sum + order.cost, 0);
  const orderCosts = evaluateOrderCosts(orders, selected, orderCostEvaluator);
  if (!orderCosts.exact) throw new Error("Cheapest-item plan has unverified retailer order costs: " + orderCosts.reason);
  return {
    selected,
    orders: orderCosts.orders,
    partsSubtotal,
    deliveryTotal,
    orderCostMinor: orderCosts.additionalMinor,
    orderCostBreakdown: orderCosts.breakdown,
    total: partsSubtotal + deliveryTotal + orderCosts.additionalMinor / 100
  };
}

