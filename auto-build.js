import { checkCompatibility } from "./compatibility.js";
import { optimizeBasket } from "./optimizer.js";

const WORKLOAD_WEIGHTS = Object.freeze({
  gaming: { cpu: 20, graphics: 65, memory: 0.25, storage: 2 },
  creative: { cpu: 42, graphics: 23, memory: 0.65, storage: 4 },
  everyday: { cpu: 28, graphics: 6, memory: 0.8, storage: 4 }
});

function capacity(product, key) {
  return Number(product?.specs?.[key]) || 0;
}

function exampleScore(build, productById, workload) {
  const weights = WORKLOAD_WEIGHTS[workload];
  return Object.entries(weights).reduce((total, [category, weight]) => {
    const component = category === "graphics" ? "graphics" : category;
    const product = productById.get(build[component]);
    let value = 0;
    if (category === "cpu" || category === "graphics") value = capacity(product, "tier") || 1;
    else if (category === "memory") value = capacity(product, "capacityGb") || capacity(product, "capacity");
    else if (category === "storage") value = capacity(product, "capacityTb") || capacity(product, "capacity");
    return total + value * weight;
  }, 0);
}

function candidateIsBetter(candidate, current) {
  if (!current) return true;
  if (candidate.score !== current.score) return candidate.score > current.score;
  if (candidate.compatibility.warningCount !== current.compatibility.warningCount) {
    return candidate.compatibility.warningCount < current.compatibility.warningCount;
  }
  if (candidate.compatibility.unknownCount !== current.compatibility.unknownCount) {
    return candidate.compatibility.unknownCount < current.compatibility.unknownCount;
  }
  if (candidate.plan.total !== current.plan.total) return candidate.plan.total < current.plan.total;
  if (candidate.plan.orders.length !== current.plan.orders.length) {
    return candidate.plan.orders.length < current.plan.orders.length;
  }
  return Object.values(candidate.build).join("|").localeCompare(Object.values(current.build).join("|")) < 0;
}

/**
 * Pick the highest-scoring compatible sample build that fits the supplied
 * budget. Workload weights are selection heuristics for demo data, not
 * benchmark-derived performance predictions.
 */
export function generateAutoBuild({
  budget,
  workload = "gaming",
  components,
  products,
  offers,
  bundles = [],
  shippingRules,
  maxCombinations = 10_000
}) {
  if (!Number.isFinite(budget) || budget < 0) throw new Error("Budget must be a non-negative EUR amount");
  if (!WORKLOAD_WEIGHTS[workload]) throw new Error("Choose a supported workload");
  if (!Array.isArray(components) || !Array.isArray(products) || !Array.isArray(offers) || !Array.isArray(bundles)) {
    throw new Error("Components, products, offers, and bundles must be arrays");
  }

  const productsByCategory = new Map();
  for (const component of components) {
    const matches = products.filter(product => product.category === component.category);
    if (matches.length === 0) throw new Error("No example products are available for " + component.category);
    productsByCategory.set(component.category, matches);
  }
  const productById = new Map(products.map(product => [product.id, product]));
  const currentBuild = {};
  let evaluatedBuilds = 0;
  let incompatibleBuilds = 0;
  let compatibleBuilds = 0;
  let withinBudgetBuilds = 0;
  let best = null;
  let cheapestCompatible = null;

  function inspectCandidate() {
    evaluatedBuilds += 1;
    const compatibility = checkCompatibility({
      components: components.map(component => ({ ...component, productId: currentBuild[component.id] })),
      products
    });
    if (compatibility.incompatibleCount > 0) {
      incompatibleBuilds += 1;
      return;
    }
    compatibleBuilds += 1;

    let plan;
    try {
      plan = optimizeBasket({
        components: components.map(component => ({ id: currentBuild[component.id] })),
        offers,
        bundles,
        catalogComponentIds: products.map(product => product.id),
        shippingRules,
        maxCombinations
      });
    } catch {
      return;
    }

    const candidate = {
      build: { ...currentBuild },
      plan,
      compatibility,
      score: exampleScore(currentBuild, productById, workload)
    };
    if (!cheapestCompatible || plan.total < cheapestCompatible.plan.total) cheapestCompatible = candidate;
    if (plan.total > budget) return;
    withinBudgetBuilds += 1;
    if (candidateIsBetter(candidate, best)) best = candidate;
  }

  function search(index) {
    if (index === components.length) {
      inspectCandidate();
      return;
    }
    const component = components[index];
    for (const product of productsByCategory.get(component.category)) {
      currentBuild[component.id] = product.id;
      search(index + 1);
    }
    delete currentBuild[component.id];
  }

  search(0);
  const counts = { evaluatedBuilds, incompatibleBuilds, compatibleBuilds, withinBudgetBuilds };
  if (best) return { status: "ready", ...best, ...counts };
  return {
    status: "no-budget-fit",
    minimumCompatibleTotal: cheapestCompatible?.plan.total ?? null,
    minimumCompatibleBuild: cheapestCompatible?.build ?? null,
    ...counts
  };
}

