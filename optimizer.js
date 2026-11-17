export function calculateShipping(items, rules) {
  const grouped = new Map();
  for (const item of items) {
    const rule = rules[item.retailerId];
    if (!rule) throw new Error("Missing shipping rule for " + item.retailerId);
    const group = grouped.get(item.retailerId) ?? { retailerId: item.retailerId, subtotal: 0, count: 0, rule };
    group.subtotal += item.price;
    group.count += 1;
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
  if (strategy === "fewest") return [plan.orders.length, plan.total, plan.retailers.join("|")];
  return [plan.total, plan.orders.length, plan.retailers.join("|")];
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

export function optimizeBasket({ components, offers, shippingRules, strategy = "lowest" }) {
  const choices = components.map(component => {
    const available = offers.filter(offer => offer.componentId === component.id && offer.available !== false);
    if (available.length === 0) throw new Error("No eligible offers for " + component.id);
    return available;
  });

  let best = null;
  let combinationsChecked = 0;
  function visit(index, selected) {
    if (index === choices.length) {
      combinationsChecked += 1;
      const orders = calculateShipping(selected, shippingRules);
      const partsSubtotal = selected.reduce((sum, item) => sum + item.price, 0);
      const deliveryTotal = orders.reduce((sum, order) => sum + order.cost, 0);
      const candidate = {
        selected: [...selected],
        orders,
        partsSubtotal,
        deliveryTotal,
        total: partsSubtotal + deliveryTotal,
        retailers: [...new Set(selected.map(item => item.retailerId))].sort(),
        combinationsChecked,
        exact: true
      };
      if (isBetter(candidate, best, strategy)) best = candidate;
      return;
    }
    for (const offer of choices[index]) {
      selected.push(offer);
      visit(index + 1, selected);
      selected.pop();
    }
  }
  visit(0, []);
  best.combinationsChecked = combinationsChecked;
  return best;
}

export function cheapestItemPlan({ components, offers, shippingRules }) {
  const selected = components.map(component => {
    const candidates = offers
      .filter(offer => offer.componentId === component.id && offer.available !== false)
      .sort((a, b) => a.price - b.price || a.retailerId.localeCompare(b.retailerId));
    if (candidates.length === 0) throw new Error("No eligible offers for " + component.id);
    return candidates[0];
  });
  const orders = calculateShipping(selected, shippingRules);
  const partsSubtotal = selected.reduce((sum, item) => sum + item.price, 0);
  const deliveryTotal = orders.reduce((sum, order) => sum + order.cost, 0);
  return { selected, orders, partsSubtotal, deliveryTotal, total: partsSubtotal + deliveryTotal };
}
