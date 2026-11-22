import { checkCompatibility } from "./compatibility.js";
import { optimizeBasket } from "./optimizer.js";
import { storageGigabytes } from "./build-quiz-state.js";

const WORKLOAD_WEIGHTS = Object.freeze({
  gaming: { cpu: 20, graphics: 65, memory: 0.25 },
  streaming: { cpu: 36, graphics: 54, memory: 0.7 },
  creative: { cpu: 42, graphics: 23, memory: 0.65 },
  "3d": { cpu: 34, graphics: 42, memory: 0.8 },
  everyday: { cpu: 28, graphics: 6, memory: 0.8 }
});
const GAMING_WEIGHTS = Object.freeze({
  "1080p:60": { cpu: 20, graphics: 65 },
  "1080p:120": { cpu: 44, graphics: 58 },
  "1080p:165": { cpu: 70, graphics: 47 },
  "1440p:60": { cpu: 16, graphics: 73 },
  "1440p:120": { cpu: 24, graphics: 70 },
  "1440p:165": { cpu: 29, graphics: 67 },
  "4k:60": { cpu: 12, graphics: 84 },
  "4k:120": { cpu: 18, graphics: 81 },
  "4k:165": { cpu: 22, graphics: 78 }
});
const VALID_RESOLUTIONS = new Set(["1080p", "1440p", "4k"]);
const VALID_FRAME_RATES = new Set([60, 120, 165]);
const VALID_SIZE_PREFERENCES = new Set(["any", "compact"]);
const VALID_STRATEGIES = new Set(["lowest", "fewest"]);
const MINIMUM_COMPONENT_TIERS = Object.freeze({
  "1080p:60": { cpu: 1, graphics: 1 }, "1080p:120": { cpu: 2, graphics: 1 }, "1080p:165": { cpu: 2, graphics: 2 },
  "1440p:60": { cpu: 1, graphics: 2 }, "1440p:120": { cpu: 2, graphics: 3 }, "1440p:165": { cpu: 2, graphics: 3 },
  "4k:60": { cpu: 1, graphics: 3 }, "4k:120": { cpu: 2, graphics: 3 }, "4k:165": { cpu: 2, graphics: 3 }
});

function capacity(product, key) {
  return Number(product?.specs?.[key]) || 0;
}

function storageCapacityGb(product) {
  return capacity(product, "capacityGb") || (capacity(product, "capacityTb") || capacity(product, "capacity")) * 1000;
}

function exampleScore(build, productById, workload, targetResolution, targetFrameRate) {
  const weights = { ...WORKLOAD_WEIGHTS[workload] };
  if (workload === "gaming") {
    Object.assign(weights, GAMING_WEIGHTS[targetResolution + ":" + targetFrameRate]);
  }
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
  if (candidate.storageExcessGb !== current.storageExcessGb) return candidate.storageExcessGb < current.storageExcessGb;
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
  targetResolution = "1080p",
  targetFrameRate = 60,
  sizePreference = "any",
  storagePreference = "1tb",
  strategy = "lowest",
  maxCombinations = 10_000
}) {
  if (!Number.isFinite(budget) || budget < 0) throw new Error("Budget must be a non-negative EUR amount");
  if (!WORKLOAD_WEIGHTS[workload]) throw new Error("Choose a supported workload");
  if (!VALID_RESOLUTIONS.has(targetResolution)) throw new Error("Choose a supported gaming resolution");
  if (!VALID_FRAME_RATES.has(targetFrameRate)) throw new Error("Choose a supported target frame rate");
  if (!VALID_SIZE_PREFERENCES.has(sizePreference)) throw new Error("Choose a supported size preference");
  const minimumStorageGb = storageGigabytes(storagePreference);
  if (minimumStorageGb === null) throw new Error("Choose a supported storage preference");
  if (!VALID_STRATEGIES.has(strategy)) throw new Error("Choose a supported basket strategy");
  if (!Array.isArray(components) || !Array.isArray(products) || !Array.isArray(offers) || !Array.isArray(bundles)) {
    throw new Error("Components, products, offers, and bundles must be arrays");
  }

  const productsByCategory = new Map();
  for (const component of components) {
    const matches = products.filter(product => {
      if (product.category !== component.category) return false;
      if (component.category === "storage" && Number(product.specs?.capacity) * 1000 < minimumStorageGb) return false;
      if (sizePreference === "compact" && ["motherboard", "case"].includes(component.category)) {
        return product.specs?.sizeClass === "compact";
      }
      return true;
    });
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
  let cheapestGoalMatch = null;

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
        strategy,
        maxCombinations
      });
    } catch {
      return;
    }

    const candidate = {
      build: { ...currentBuild },
      plan,
      compatibility,
      storageExcessGb: storageCapacityGb(productById.get(currentBuild.storage)) - minimumStorageGb,
      score: exampleScore(currentBuild, productById, workload, targetResolution, targetFrameRate)
    };
    if (!cheapestCompatible || plan.total < cheapestCompatible.plan.total) cheapestCompatible = candidate;
    const minimumTiers = workload === "gaming" ? MINIMUM_COMPONENT_TIERS[targetResolution + ":" + targetFrameRate] : null;
    if (minimumTiers && (capacity(productById.get(currentBuild.cpu), "tier") < minimumTiers.cpu ||
        capacity(productById.get(currentBuild.graphics), "tier") < minimumTiers.graphics)) return;
    if (!cheapestGoalMatch || plan.total < cheapestGoalMatch.plan.total) cheapestGoalMatch = candidate;
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
  if (best) return { status: "ready", ...best, minimumGoalTotal: cheapestGoalMatch?.plan.total ?? null, minimumGoalBuild: cheapestGoalMatch?.build ?? null, ...counts };
  return {
    status: "no-budget-fit",
    minimumCompatibleTotal: cheapestGoalMatch?.plan.total ?? null,
    minimumCompatibleBuild: cheapestGoalMatch?.build ?? null,
    minimumGoalTotal: cheapestGoalMatch?.plan.total ?? null,
    minimumGoalBuild: cheapestGoalMatch?.build ?? null,
    closestCompatibleTotal: cheapestCompatible?.plan.total ?? null,
    closestCompatibleBuild: cheapestCompatible?.build ?? null,
    ...counts
  };
}
