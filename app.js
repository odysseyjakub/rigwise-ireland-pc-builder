import { BUNDLES, COMPONENTS, COUNTIES, DEFAULT_BUILD, OFFERS, PRODUCTS, RETAILERS, SHIPPING_RULES } from "./data.js";
import { checkCompatibility } from "./compatibility.js";
import { generateAutoBuild } from "./auto-build.js";
import { readStorageValue, removeStorageValue, writeStorageValue } from "./browser-storage.js";
import { getOrCreateLocalAccount, migrateLegacySavedBuilds } from "./local-account.js";
import { cheapestItemPlan, optimizeBasket } from "./optimizer.js";
import { decodeShareHash, encodeShareHash } from "./share-state.js";
import { createSavedBuildSnapshot, duplicateSavedBuild, MAX_SAVED_BUILDS, prependSavedBuild, renameSavedBuild } from "./saved-builds.js";
import { isValidStoragePreference, readQuizPreferences, storageGigabytes } from "./build-quiz-state.js";
import { estimateAccessories, normalizeAccessories } from "./accessories.js";
import { fetchBuildFps, FPS_RESOLUTIONS } from "./fps-estimates.js";

const $ = selector => document.querySelector(selector);
const money = value => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(value);
const productById = id => PRODUCTS.find(product => product.id === id);
const VALID_RESOLUTIONS = new Set(["1080p", "1440p", "4k"]);
const VALID_FRAME_RATES = new Set([60, 120, 165]);
const VALID_SIZE_PREFERENCES = new Set(["any", "compact"]);
const VALID_STRATEGIES = new Set(["lowest", "fewest"]);
let localAccount = getOrCreateLocalAccount();
let STORAGE_KEY = localAccount.persisted
  ? migrateLegacySavedBuilds(localAccount.id).key
  : "rigwise-demo-builds-v1";
const ICONS = {
  cpu: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 9h6v6H9zM9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/></svg>',
  cooler: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M12 4c2 2 2 4 0 6M20 12c-2 2-4 2-6 0M12 20c-2-2-2-4 0-6M4 12c2-2 4-2 6 0"/></svg>',
  board: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="8" y="8" width="6" height="6" rx="1"/><path d="M16 8h1M16 11h1M8 16h1M11 16h1M7 2v2M17 2v2M7 20v2M17 20v2"/></svg>',
  memory: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h18v10H3zM6 17v3M10 17v3M14 17v3M18 17v3M7 10h2M12 10h2M17 10h1"/></svg>',
  gpu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h16l2 2v9H3zM21 10h2v4h-2"/><circle cx="9" cy="11.5" r="3"/><circle cx="16" cy="11.5" r="2"/></svg>',
  storage: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 10h4M14 14h4"/></svg>',
  power: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 2-9 12h7l-1 8 10-13h-7z"/></svg>',
  case: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="2"/><path d="M9 6h6M9 17h6"/><circle cx="15" cy="10" r="2"/></svg>'
};

function readSavedBuilds() {
  try {
    const value = JSON.parse(readStorageValue(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.filter(item => item && item.build && typeof item.name === "string") : [];
  } catch {
    return [];
  }
}

function fromShareHash() {
  return decodeShareHash(location.hash, { components: COMPONENTS, products: PRODUCTS, counties: COUNTIES });
}

const shared = fromShareHash();
const quizPreferences = readQuizPreferences(location.search);
let build = shared?.build ? { ...DEFAULT_BUILD, ...shared.build } : { ...DEFAULT_BUILD };
let budget = Number(shared?.budget ?? quizPreferences?.budget) || 1000;
let workload = shared?.workload || quizPreferences?.workload || "gaming";
let targetResolution = VALID_RESOLUTIONS.has(shared?.targetResolution ?? quizPreferences?.targetResolution) ? (shared?.targetResolution ?? quizPreferences?.targetResolution) : "1080p";
let targetFrameRate = VALID_FRAME_RATES.has(shared?.targetFrameRate ?? quizPreferences?.targetFrameRate) ? (shared?.targetFrameRate ?? quizPreferences?.targetFrameRate) : 60;
let sizePreference = VALID_SIZE_PREFERENCES.has(shared?.sizePreference ?? quizPreferences?.sizePreference) ? (shared?.sizePreference ?? quizPreferences?.sizePreference) : "any";
let storagePreference = isValidStoragePreference(shared?.storagePreference ?? quizPreferences?.storagePreference) ? (shared?.storagePreference ?? quizPreferences?.storagePreference) : "1tb";
let strategyPreference = VALID_STRATEGIES.has(shared?.strategy ?? quizPreferences?.strategy) ? (shared?.strategy ?? quizPreferences?.strategy) : "lowest";
let accessories = normalizeAccessories(shared?.accessories ?? quizPreferences?.accessories ?? []);
const storedCounty = readStorageValue("rigwise-county");
let county = COUNTIES.includes(shared?.county)
  ? shared.county
  : COUNTIES.includes(storedCounty)
    ? storedCounty
    : "Dublin";
let expanded = new Set();
let partStepIndex = 0;
let toastTimer;
let localShopLookupSequence = 0;
let localShopLookupController = null;
let savedBuildDialogAction = null;
let fpsRequestSequence = 0;
let activeFpsKey = "";
const fpsEstimateCache = new Map();

function buildItems() {
  return COMPONENTS.map(component => ({ ...component, productId: build[component.id] }));
}

function currentProducts() {
  return buildItems().map(item => productById(item.productId));
}

function selectedOffers() {
  const ids = new Set(Object.values(build));
  return OFFERS.filter(offer => ids.has(offer.componentId));
}

function currentPlan() {
  return optimizeBasket({
    components: buildItems().map(item => ({ id: item.productId, buildId: item.id })),
    offers: selectedOffers(),
    bundles: BUNDLES,
    catalogComponentIds: PRODUCTS.map(product => product.id),
    shippingRules: SHIPPING_RULES,
    strategy: strategyPreference
  });
}

function offerFor(productId, retailerId) {
  return OFFERS.find(offer => offer.componentId === productId && offer.retailerId === retailerId);
}

function renderOfferComparison(item, plan) {
  const product = productById(item.productId);
  const assignment = plan.assignments[item.productId];
  const chosen = assignment?.type === "offer" ? plan.selected.find(offer => offer.id === assignment.offerId) : null;
  const bundle = assignment?.type === "bundle" ? BUNDLES.find(candidate => candidate.id === assignment.bundleId) : null;
  const offers = OFFERS.filter(offer => offer.componentId === item.productId).sort((a, b) => a.price - b.price);
  return '<div class="offer-comparison"><div class="offer-heading"><span>ILLUSTRATIVE SHOP COMPARISON</span><span>Item price · delivery is calculated per basket</span></div>' +
    (bundle ? '<div class="bundle-note" role="status"><strong>Included in ' + escapeHTML(bundle.name) + '.</strong> The combined kit costs ' + money(bundle.price) + ' for ' + bundle.covers.length + ' selected parts; the demo does not allocate a separate price to each part.</div>' : "") +
    offers.map(offer => {
      const shop = Object.values(RETAILERS).find(retailer => retailer.id === offer.retailerId);
      const isChosen = chosen?.id === offer.id;
      return '<div class="offer-line' + (isChosen ? " offer-selected" : "") + '">' +
        '<span class="offer-shop"><span class="shop-avatar">' + shop.shortName.slice(-1) + '</span><span>' + shop.name + '<small>' + shop.note + '</small></span></span>' +
        '<span class="offer-evidence">Demo only</span><strong class="offer-price">' + money(offer.price) + '</strong>' +
        (isChosen ? '<span class="chosen-tag">IN PLAN</span>' : '<span class="offer-empty"></span>') +
        '</div>';
    }).join("") + '<p class="offer-note">Sample figures only · no live stock, delivery quote, or purchase link</p></div>';
}

function renderParts(plan) {
  const component = COMPONENTS[partStepIndex] || COMPONENTS[0];
  const item = buildItems().find(part => part.id === component.id);
  const filtered = item ? [item] : [];
  const stepLabel = item ? item.label : "Component";
  $("#parts-step-number").textContent = "STEP " + (partStepIndex + 1) + " OF " + COMPONENTS.length;
  $("#parts-step-title").textContent = stepLabel;
  const progress = Math.round((partStepIndex + 1) / COMPONENTS.length * 100);
  $("#parts-step-progress").style.width = progress + "%";
  $(".parts-step-track").setAttribute("aria-valuenow", String(progress));
  $("#parts-step-back").disabled = partStepIndex === 0;
  $("#parts-step-next").textContent = partStepIndex === COMPONENTS.length - 1 ? "Review your build →" : "Next part →";
  $("#parts-list").innerHTML = filtered.map(item => {
    const product = productById(item.productId);
    const assignment = plan.assignments[item.productId];
    const chosen = assignment?.type === "offer" ? plan.selected.find(offer => offer.id === assignment.offerId) : null;
    const bundle = assignment?.type === "bundle" ? BUNDLES.find(candidate => candidate.id === assignment.bundleId) : null;
    const lowest = OFFERS.filter(offer => offer.componentId === item.productId).sort((a, b) => a.price - b.price)[0];
    const expandedClass = expanded.has(item.id);
    const options = PRODUCTS.filter(option => option.category === item.category).map(option =>
      '<option value="' + option.id + '"' + (option.id === product.id ? " selected" : "") + '>' + option.name + '</option>'
    ).join("");
    return '<article class="part-row' + (expandedClass ? " part-expanded" : "") + '">' +
      '<div class="part-main">' +
      '<span class="part-icon icon-' + item.icon + '">' + ICONS[item.icon] + '</span>' +
      '<div class="part-info"><span class="part-category">' + item.label.toUpperCase() + '</span><strong>' + product.name + '</strong><span class="part-detail">' + product.detail + '</span></div>' +
      '<label class="visually-hidden" for="select-' + item.id + '">Choose ' + item.label + '</label><select class="part-select" id="select-' + item.id + '" data-component="' + item.id + '">' + options + '</select>' +
      '<div class="part-price"><strong>' + (bundle ? "Bundled" : money(chosen?.price ?? 0)) + '</strong><span>' + (bundle ? money(bundle.price) + " kit total" : "in this plan") + '</span></div>' +
      '<button class="offer-toggle" type="button" data-expand="' + item.id + '" aria-expanded="' + expandedClass + '" aria-label="' + (expandedClass ? "Hide" : "Compare") + ' sample offers for ' + item.label + '"><span>' + (expandedClass ? "Close" : "Compare") + '</span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7 5 5 5-5"/></svg><small>' + money(lowest.price) + ' lowest item</small></button>' +
      '</div>' + (expandedClass ? renderOfferComparison(item, plan) : "") + '</article>';
  }).join("");
  $("#parts-list").classList.toggle("empty-list", filtered.length === 0);
  if (filtered.length === 0) $("#parts-list").innerHTML = '<div class="empty-search">No component is available for this step.</div>';
}

function escapeHTML(value) {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function renderPlan(plan) {
  $("#parts-subtotal").textContent = money(plan.partsSubtotal);
  $("#delivery-total").textContent = money(plan.deliveryTotal);
  $("#grand-total").textContent = money(plan.total);
  const remainder = budget - plan.total;
  $("#budget-remaining").textContent = remainder >= 0 ? money(remainder) + " left" : money(Math.abs(remainder)) + " over";
  $("#budget-remaining").classList.toggle("over-budget", remainder < 0);
  $("#budget-meter-fill").style.width = Math.min(100, Math.max(4, plan.total / Math.max(1, budget) * 100)) + "%";
  $("#budget-meter-fill").classList.toggle("over-budget-fill", remainder < 0);
  $("#shop-count").textContent = plan.orders.length + (plan.orders.length === 1 ? " shop" : " shops");
  $("#shop-orders").innerHTML = plan.orders.map(order => {
    const shop = Object.values(RETAILERS).find(retailer => retailer.id === order.retailerId);
    const partCount = Object.values(plan.assignments).filter(assignment => assignment.retailerId === order.retailerId).length;
    const bundleNames = plan.bundles.filter(bundle => bundle.retailerId === order.retailerId).map(bundle => bundle.name);
    const orderDetail = partCount + (partCount === 1 ? " part" : " parts") + (bundleNames.length ? " · includes " + bundleNames.map(escapeHTML).join(", ") : " · " + shop.note);
    return '<div class="shop-order"><span class="shop-avatar">' + shop.shortName.slice(-1) + '</span><span class="order-shop">' + shop.name + '<small>' + orderDetail + '</small></span><strong>' + (order.cost === 0 ? "FREE*" : money(order.cost)) + '</strong></div>';
  }).join("");
  const cheapest = cheapestItemPlan({ components: buildItems().map(item => ({ id: item.productId })), offers: selectedOffers(), shippingRules: SHIPPING_RULES });
  const delta = cheapest.total - plan.total;
  const reason = delta > 0.009
    ? (plan.exact ? "The whole-basket plan saves " : "This best-known whole-basket plan saves ") + money(delta) + " versus picking the cheapest item listing for each part, after sample delivery fees."
    : plan.exact
      ? "The lowest item listings also make the lowest sample basket for this selection."
      : "The search limit was reached before the lowest whole-basket total could be proven.";
  const bundleReason = plan.bundles.length
    ? " Includes " + plan.bundles.map(bundle => bundle.name + " at " + money(bundle.price) + " for " + bundle.covers.length + " parts."
      ).join(" ")
    : "";
  $("#optimiser-reason").textContent = reason + bundleReason;
  $("#plan-status").classList.toggle("plan-over-budget", remainder < 0);
  const searchStatus = plan.exact
    ? "Exact demo search · " + plan.combinationsChecked + " combinations checked"
    : "Best-known demo plan · " + plan.combinationsChecked + " combinations checked (" + plan.maxCombinations + " limit)";
  $("#plan-status").innerHTML = "<span></span><span>" + (remainder < 0 ? "Illustrative total is over your budget · " : "") + searchStatus + "</span>";
}

function renderSetupSummary(plan) {
  const host = $("#setup-summary");
  if (!host) return;
  const allowance = estimateAccessories(accessories, targetResolution);
  const setup = plan.total + allowance;
  host.innerHTML = '<div><span>PC tower · demo basket</span><strong>' + money(plan.total) + '</strong></div>' +
    '<div><span>Accessories · sample allowance</span><strong>+' + money(allowance) + '</strong></div>' +
    '<div class="setup-summary-total"><span>PC + accessories planning total</span><strong>' + money(setup) + '</strong></div>' +
    '<p>Accessories are separate from your PC budget. Allowances are illustrative, not product offers or live prices.</p>';
}

function renderFpsPowerReference(gpu) {
  const host = $("#fps-power-reference");
  if (!host) return;
  if (!gpu) {
    host.textContent = "Whole-PC average power is not available for this example build.";
    return;
  }
  const reference = Number.isFinite(gpu.averageGamingPowerW)
    ? gpu.averageGamingPowerW + " W average GPU gaming power"
    : Number.isFinite(gpu.specs?.watts)
      ? gpu.specs.watts + " W typical GPU board power"
      : "GPU power reference unavailable";
  host.textContent = reference + " · whole-PC average power is not published for these exact parts.";
}

function renderFpsTable(rows) {
  const host = $("#fps-results");
  if (!host) return;
  const table = document.createElement("table");
  table.className = "fps-table";
  const head = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const gameHeader = document.createElement("th");
  gameHeader.scope = "col";
  gameHeader.textContent = "Game";
  headerRow.append(gameHeader);
  FPS_RESOLUTIONS.forEach(resolution => {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.textContent = resolution;
    headerRow.append(cell);
  });
  head.append(headerRow);
  const body = document.createElement("tbody");
  rows.forEach(game => {
    const row = document.createElement("tr");
    const title = document.createElement("th");
    title.scope = "row";
    const sourceUrl = game.resolutions.find(result => result.sourceUrl)?.sourceUrl || "https://fpshq.com/games/" + encodeURIComponent(game.slug) + "/";
    const sourceLink = document.createElement("a");
    sourceLink.href = sourceUrl;
    sourceLink.target = "_blank";
    sourceLink.rel = "noreferrer";
    sourceLink.textContent = game.name;
    title.append(sourceLink);
    row.append(title);
    game.resolutions.forEach(result => {
      const cell = document.createElement("td");
      if (result.status !== "available") {
        cell.className = "fps-unavailable";
        cell.textContent = "Unavailable";
      } else {
        const score = document.createElement("strong");
        score.textContent = Math.round(result.fps) + " FPS";
        const label = document.createElement("small");
        label.textContent = result.source === "benchmark" ? "Measured" : "Estimate";
        cell.append(score, label);
        if (result.minimum !== null && result.maximum !== null && result.minimum !== result.maximum) {
          const range = document.createElement("small");
          range.textContent = Math.round(result.minimum) + "–" + Math.round(result.maximum) + " range";
          cell.append(range);
        }
      }
      row.append(cell);
    });
    body.append(row);
  });
  table.append(head, body);
  host.replaceChildren(table);
}

async function loadFpsEstimates({ retry = false } = {}) {
  const details = $("#fps-estimates");
  if (!details?.open) return;
  const requestId = ++fpsRequestSequence;
  const cpu = productById(build.cpu);
  const gpu = productById(build.graphics);
  renderFpsPowerReference(gpu);
  const status = $("#fps-status");
  const retryButton = $("#fps-retry");
  const resultHost = $("#fps-results");
  if (workload !== "gaming") {
    status.textContent = "FPS estimates are shown for gaming builds. Change the main use to gaming to load them.";
    retryButton.hidden = true;
    resultHost.replaceChildren();
    return;
  }
  if (!cpu?.fpsCpuSlug || !gpu?.fpsGpuSlug) {
    status.textContent = "There is no FPSHQ hardware match for this processor and graphics card yet.";
    retryButton.hidden = true;
    resultHost.replaceChildren();
    return;
  }
  const key = cpu.fpsCpuSlug + "|" + gpu.fpsGpuSlug;
  if (!retry && activeFpsKey === key && resultHost.childElementCount) return;
  activeFpsKey = key;
  if (retry) fpsEstimateCache.delete(key);
  status.textContent = "Loading performance data for the selected parts…";
  retryButton.hidden = true;
  resultHost.replaceChildren();
  try {
    let estimate = fpsEstimateCache.get(key);
    if (!estimate) {
      estimate = fetchBuildFps({ cpu, gpu });
      fpsEstimateCache.set(key, estimate);
    }
    const rows = await estimate;
    if (requestId !== fpsRequestSequence || activeFpsKey !== key) return;
    renderFpsTable(rows);
    const availableCount = rows.flatMap(game => game.resolutions).filter(result => result.status === "available").length;
    const unavailable = rows.flatMap(game => game.resolutions).filter(result => result.status !== "available");
    status.textContent = availableCount === rows.length * FPS_RESOLUTIONS.length
      ? "Performance reference for " + cpu.name + " + " + gpu.name + "."
      : availableCount
        ? "Some combinations are unavailable in FPSHQ. Available results are shown below."
        : unavailable.length && unavailable.every(result => result.reason === "network")
          ? "FPSHQ could not be reached from Vercel over HTTPS. Estimates are unavailable right now."
          : "No FPS results were returned for this hardware combination.";
    retryButton.hidden = availableCount === rows.length * FPS_RESOLUTIONS.length;
  } catch {
    if (requestId !== fpsRequestSequence) return;
    status.textContent = "Performance data could not be loaded. Check your connection and try again.";
    retryButton.hidden = false;
  }
}

function renderCompatibility() {
  const result = checkCompatibility({ components: buildItems(), products: PRODUCTS });
  const panel = $("#compatibility");
  const passed = result.checks.filter(check => check.status === "compatible").length;
  const statusText = {
    incompatible: "Known incompatibility found",
    warning: "Compatibility warnings to review",
    unknown: "Compatibility data is incomplete"
  };
  const summary = passed + " checks passed" +
    (result.warningCount ? " · " + result.warningCount + " warning" + (result.warningCount === 1 ? "" : "s") : "") +
    (result.incompatibleCount ? " · " + result.incompatibleCount + " conflict" + (result.incompatibleCount === 1 ? "" : "s") : "") +
    (result.unknownCount ? " · " + result.unknownCount + " unverified" : "");
  if (result.status === "compatible") {
    panel.innerHTML = '<div class="compat-good"><span class="compat-mark">✓</span><div><strong>All recorded demo rules pass</strong><span>' + summary + ' for these example parts. This does not verify real hardware revisions or manufacturer QVL data.</span></div><span class="compat-label">COMPATIBLE</span></div>';
    return;
  }
  panel.innerHTML = '<div class="compat-heading"><span class="compat-mark">!</span><div><strong>' + statusText[result.status] + '</strong><span>' + summary + ' · simplified demo specifications only</span></div></div>' +
    result.issues.map(issue => '<div class="compat-issue severity-' + issue.status + '"><strong>' + issue.title + '</strong><span>' + issue.detail + '</span></div>').join("");
}

function renderSavedBuilds() {
  const host = $("#saved-builds");
  if (!host) return;
  const saved = readSavedBuilds();
  host.innerHTML = '<div class="saved-heading"><span>SAVED BUILDS · ' + saved.length + '/' + MAX_SAVED_BUILDS + '</span><a class="saved-manage-link" href="saved-builds.html">Manage your builds →</a></div>' +
    '<p class="saved-empty">Your saved builds have their own home. Open the page to rename, duplicate, share or remove them.</p>';
}

function renderLocalAccount() {
  $("#local-account-id").textContent = localAccount.id;
  $("#local-account-state").textContent = localAccount.persisted
    ? "ID saved in this browser"
    : "Temporary ID · browser storage is unavailable";
}

const comparisonSpecLabels = {
  socket: "CPU socket",
  memoryGen: "Memory generation",
  watts: "Rated power",
  sockets: "Supported sockets",
  maxTdp: "Example cooling rating",
  form: "Board form factor",
  capacity: "Capacity",
  length: "Card length",
  boardSizes: "Supported board sizes",
  maxGpuLength: "Maximum GPU length"
};

function syncComparisonSelectors() {
  const category = $("#compare-category").value;
  const products = PRODUCTS.filter(product => product.category === category);
  for (const [index, id] of ["compare-one", "compare-two", "compare-three"].entries()) {
    const select = $("#" + id);
    const previous = select.value;
    const third = index === 2;
    const optionMarkup = products.map(product =>
      '<option value="' + escapeHTML(product.id) + '">' + escapeHTML(product.name) + "</option>"
    ).join("");
    select.innerHTML = (third ? '<option value="">Choose a third product</option>' : "") + optionMarkup;
    if (products.some(product => product.id === previous)) {
      select.value = previous;
    } else if (third) {
      select.value = "";
    } else {
      select.value = products[Math.min(index, products.length - 1)]?.id ?? "";
    }
  }
}

function comparisonSpecValue(key, value, category) {
  const raw = Array.isArray(value) ? value.join(", ") : String(value);
  if (typeof value === "number") {
    if (key === "watts" || key === "maxTdp") return raw + " W";
    if (key === "length" || key === "maxGpuLength") return raw + " mm";
    if (key === "capacity") return raw + (category === "storage" ? " TB" : " GB");
  }
  return raw;
}

function compatibilitySummaryForProduct(product) {
  const component = COMPONENTS.find(item => item.category === product.category);
  if (!component) return { status: "unknown", label: "Unverified" };
  const candidate = { ...build, [component.id]: product.id };
  const result = checkCompatibility({
    components: COMPONENTS.map(item => ({ ...item, productId: candidate[item.id] })),
    products: PRODUCTS
  });
  const label = {
    compatible: "Recorded rules pass",
    warning: "Review warnings",
    incompatible: result.incompatibleCount + " conflict" + (result.incompatibleCount === 1 ? "" : "s"),
    unknown: "Unverified"
  }[result.status];
  const reasons = result.issues.map(issue => issue.title + ": " + issue.detail).join(" ");
  return { status: result.status, label, reasons: reasons || "No recorded compatibility issue for this example configuration." };
}

function renderComparison() {
  const host = $("#comparison-table-wrap");
  if (!host) return;
  try {
    const comparison = compareCatalogProducts({
      category: $("#compare-category").value,
      productIds: [$("#compare-one").value, $("#compare-two").value, $("#compare-three").value],
      products: PRODUCTS,
      offers: OFFERS
    });
    const rows = [
      ["Lowest sample item price", comparison.columns.map(column =>
        column.lowestExamplePrice === null
          ? "Not listed"
          : money(column.lowestExamplePrice) + " · " + column.exampleOfferCount + " sample offers"
      )],
      ["Compatibility with this build", comparison.columns.map(column => {
        const summary = compatibilitySummaryForProduct(column.product);
        return '<span class="compare-compat compare-compat-' + summary.status + '" title="' + escapeHTML(summary.reasons) + '">' + escapeHTML(summary.label) + '</span>';
      })],
      ...comparison.specKeys.map(key => [comparisonSpecLabels[key] || key, comparison.columns.map(column =>
        Object.prototype.hasOwnProperty.call(column.specs, key)
          ? comparisonSpecValue(key, column.specs[key], comparison.category)
          : "Not listed in this demo"
      )])
    ];
    host.innerHTML = '<table class="comparison-table"><thead><tr><th scope="col">' + escapeHTML(comparison.categoryLabel) + '</th>' +
      comparison.columns.map(column => '<th scope="col"><strong>' + escapeHTML(column.product.name) + '</strong><small>' + escapeHTML(column.product.detail) + '</small></th>').join("") +
      '</tr></thead><tbody>' + rows.map(([label, values]) => '<tr><th scope="row">' + escapeHTML(label) + '</th>' +
        values.map(value => '<td>' + (value.startsWith?.("<span class=\"compare-compat") ? value : escapeHTML(value)) + '</td>').join("") +
        '</tr>').join("") + '</tbody></table>';
  } catch (error) {
    host.innerHTML = '<p class="comparison-empty">' + escapeHTML(error.message) + '</p>';
  }
}

function render() {
  const plan = currentPlan();
  renderParts(plan);
  renderPlan(plan);
  renderSetupSummary(plan);
  renderCompatibility();
  renderSavedBuilds();
  renderComparison();
  $("#budget").value = budget;
  $("#budget-range").value = Math.max(400, Math.min(5500, budget));
  $("#workload").value = workload;
  $("#target-resolution").value = targetResolution;
  $("#target-frame-rate").value = String(targetFrameRate);
  $("#size-preference").value = sizePreference;
  $("#storage-preference").value = String(storageGigabytes(storagePreference) || 1000);
  $("#strategy").value = strategyPreference;
  if ($("#fps-estimates")?.open) loadFpsEstimates();
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("toast-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("toast-visible"), 2600);
}

function newSavedBuildId() {
  const randomUUID = globalThis.crypto?.randomUUID;
  return typeof randomUUID === "function" ? randomUUID.call(globalThis.crypto) : "build-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
}

function openSavedBuildDialog(action, item) {
  if (action !== "rename" && readSavedBuilds().length >= MAX_SAVED_BUILDS) {
    showToast("Saved-build limit reached. Remove a build first.");
    return;
  }
  const dialog = $("#saved-build-dialog");
  const input = $("#saved-build-name");
  savedBuildDialogAction = action === "rename" && item ? { type: action, id: item.id } : { type: "save" };
  $("#saved-build-dialog-title").textContent = action === "rename" ? "Rename saved build" : "Save this build";
  $("#saved-build-dialog-submit").textContent = action === "rename" ? "Update name" : "Save build";
  input.value = action === "rename" && item ? item.name : workloadLabel(workload) + " · " + new Date().toLocaleDateString("en-IE");
  $("#saved-build-dialog-error").hidden = true;
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
    input.focus();
    input.select();
  } else {
    showToast("Saved-build naming is unavailable in this browser.");
  }
}

function persistSavedBuild(item) {
  const saved = readSavedBuilds();
  const next = prependSavedBuild(saved, item);
  if (!next) {
    const message = "Saved-build limit reached. Remove a build first.";
    if ($("#saved-build-dialog").open) {
      $("#saved-build-dialog-error").textContent = message;
      $("#saved-build-dialog-error").hidden = false;
    }
    showToast(message);
    return false;
  }
  if (!writeStorageValue(STORAGE_KEY, JSON.stringify(next))) {
    showToast("Your browser blocked local saving. Copy a share link to keep this build.");
    return false;
  }
  renderSavedBuilds();
  return true;
}

function saveBuild(name) {
  if (readSavedBuilds().length >= MAX_SAVED_BUILDS) {
    showToast("Saved-build limit reached. Remove a build first.");
    return false;
  }
  const plan = currentPlan();
  const now = new Date().toISOString();
  const item = createSavedBuildSnapshot({
    id: newSavedBuildId(),
    accountId: localAccount.id,
    name,
    build,
    budget,
    workload,
    targetResolution,
    targetFrameRate,
    sizePreference,
    storagePreference,
    strategy: strategyPreference,
    accessories,
    accessoryTotal: estimateAccessories(accessories, targetResolution),
    county,
    total: plan.total,
    createdAt: now
  });
  if (!persistSavedBuild(item)) return false;
  showToast("Build saved in this browser.");
  return true;
}

function duplicateBuild(id) {
  const source = readSavedBuilds().find(item => item.id === id);
  if (!source) return;
  try {
    const item = duplicateSavedBuild(source, { id: newSavedBuildId(), accountId: localAccount.id, createdAt: new Date().toISOString() });
    if (persistSavedBuild(item)) showToast("Build duplicated.");
  } catch (error) {
    showToast(error instanceof Error ? error.message : "This build could not be duplicated.");
  }
}

function renameBuild(id, name) {
  try {
    const saved = renameSavedBuild(readSavedBuilds(), id, name, new Date().toISOString());
    if (!writeStorageValue(STORAGE_KEY, JSON.stringify(saved))) {
      showToast("Your browser could not update saved builds.");
      return false;
    }
    renderSavedBuilds();
    showToast("Build name updated.");
    return true;
  } catch (error) {
    $("#saved-build-dialog-error").textContent = error instanceof Error ? error.message : "Enter a valid build name.";
    $("#saved-build-dialog-error").hidden = false;
    return false;
  }
}

function workloadLabel(value) {
  return value === "creative" ? "Creative" : value === "everyday" ? "Everyday" : "Gaming";
}

function shareBuild() {
  const payload = { build, budget, workload, targetResolution, targetFrameRate, sizePreference, storagePreference, strategy: strategyPreference, accessories, county };
  const hash = encodeShareHash(payload);
  if (!hash) {
    showToast("This build could not be encoded for sharing.");
    return;
  }
  const url = location.origin + location.pathname + hash;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).then(() => showToast("Share link copied.")).catch(() => showToast("Copy the link from your browser address bar after sharing."));
  } else {
    showToast("Share the page URL to send this build.");
  }
}

function generateBuild() {
  budget = Math.max(400, Math.min(5500, Number($("#budget").value) || 1000));
  $("#budget").value = budget;
  const result = generateAutoBuild({
    budget,
    workload,
    targetResolution,
    targetFrameRate,
    sizePreference,
    storagePreference,
    strategy: strategyPreference,
    components: COMPONENTS,
    products: PRODUCTS,
    offers: OFFERS,
    bundles: BUNDLES,
    shippingRules: SHIPPING_RULES
  });
  if (result.status !== "ready") {
    const message = result.minimumGoalTotal === null
      ? "The current sample catalogue has no " + (workload === "gaming" ? targetResolution + " target" : "matching") + " build for this size and storage choice. Change one of those preferences."
      : "The closest sample build for your preferences is " + money(result.minimumGoalTotal) + ", " + money(result.minimumGoalTotal - budget) + " above your PC budget. Increase the budget or choose a lower gaming target.";
    if (result.minimumGoalBuild) {
      build = result.minimumGoalBuild;
      expanded.clear();
      $("#build-status").textContent = workloadLabel(workload) + " · closest sample above budget";
      render();
    }
    setBuildRecommendation(message, "warning");
    showToast(message);
    return;
  }
  build = result.build;
  expanded.clear();
  $("#build-status").textContent = workloadLabel(workload) + " build · sample fit for preferences";
  render();
  setBuildRecommendation("Your answers are matched to the current sample parts. The displayed PC total is separate from your accessory allowance; neither is a live retailer quote.", "info");
  showToast("A compatible sample build fits your budget. No benchmark data is connected.");
}

function setBuildRecommendation(message, kind) {
  const notice = $("#build-recommendation");
  if (!notice) return;
  notice.textContent = message;
  notice.dataset.kind = kind;
  notice.hidden = false;
}

$("#parts-list").addEventListener("change", event => {
  const component = event.target.dataset.component;
  if (!component) return;
  build[component] = event.target.value;
  $("#build-status").textContent = workloadLabel(workload) + " build · manually configured";
  render();
});

$("#fps-estimates").addEventListener("toggle", () => {
  if ($("#fps-estimates").open) loadFpsEstimates();
});
$("#fps-retry").addEventListener("click", () => loadFpsEstimates({ retry: true }));

$("#parts-list").addEventListener("click", event => {
  const button = event.target.closest("[data-expand]");
  if (!button) return;
  const id = button.dataset.expand;
  if (expanded.has(id)) expanded.delete(id);
  else expanded.add(id);
  render();
  $("#select-" + id)?.focus({ preventScroll: true });
});

$("#parts-step-back").addEventListener("click", () => {
  partStepIndex = Math.max(0, partStepIndex - 1);
  expanded.clear();
  render();
  $("#select-" + COMPONENTS[partStepIndex].id)?.focus({ preventScroll: true });
});
$("#parts-step-next").addEventListener("click", () => {
  if (partStepIndex < COMPONENTS.length - 1) {
    partStepIndex += 1;
    expanded.clear();
    render();
    $("#select-" + COMPONENTS[partStepIndex].id)?.focus({ preventScroll: true });
    return;
  }
  $("#plan-title").scrollIntoView({ behavior: "smooth", block: "center" });
  $("#plan-title").focus({ preventScroll: true });
});
$("#compare-category")?.addEventListener("change", () => {
  syncComparisonSelectors();
  renderComparison();
});
for (const id of ["compare-one", "compare-two", "compare-three"]) {
  $("#" + id)?.addEventListener("change", renderComparison);
}
$("#strategy").addEventListener("change", event => {
  strategyPreference = VALID_STRATEGIES.has(event.target.value) ? event.target.value : "lowest";
  render();
});
$("#budget").addEventListener("change", () => {
  budget = Math.max(400, Math.min(5500, Number($("#budget").value) || 1000));
  render();
});
$("#budget-range").addEventListener("input", event => {
  budget = Number(event.target.value);
  $("#budget").value = budget;
  renderPlan(currentPlan());
});
$("#workload").addEventListener("change", event => {
  workload = event.target.value;
  $("#build-status").textContent = workloadLabel(workload) + " build · selection preserved";
  if ($("#fps-estimates").open) loadFpsEstimates();
});
$("#target-resolution").addEventListener("change", event => {
  targetResolution = VALID_RESOLUTIONS.has(event.target.value) ? event.target.value : "1080p";
  $("#build-status").textContent = workloadLabel(workload) + " build · preferences changed";
});
$("#target-frame-rate").addEventListener("change", event => {
  const value = Number(event.target.value);
  targetFrameRate = VALID_FRAME_RATES.has(value) ? value : 60;
  $("#build-status").textContent = workloadLabel(workload) + " build · preferences changed";
});
$("#size-preference").addEventListener("change", event => {
  sizePreference = VALID_SIZE_PREFERENCES.has(event.target.value) ? event.target.value : "any";
  $("#build-status").textContent = workloadLabel(workload) + " build · preferences changed";
});
$("#storage-preference").addEventListener("change", event => {
  const requestedGb = Number(event.target.value);
  storagePreference = isValidStoragePreference(requestedGb + "gb") ? requestedGb + "gb" : "1tb";
  event.target.value = String(storageGigabytes(storagePreference));
  $("#build-status").textContent = workloadLabel(workload) + " build · storage preference changed";
});
$("#generate-build").addEventListener("click", generateBuild);
$("#save-build").addEventListener("click", () => openSavedBuildDialog("save"));
$("#share-build").addEventListener("click", shareBuild);

$("#saved-build-form").addEventListener("submit", event => {
  event.preventDefault();
  const name = $("#saved-build-name").value;
  const succeeded = savedBuildDialogAction?.type === "rename"
    ? renameBuild(savedBuildDialogAction.id, name)
    : saveBuild(name);
  if (succeeded) $("#saved-build-dialog").close();
});
$("#saved-build-dialog-cancel").addEventListener("click", () => $("#saved-build-dialog").close());

$(".theme-toggle").addEventListener("click", () => {
  const enabled = document.body.classList.toggle("dark-theme");
  writeStorageValue("rigwise-theme", enabled ? "dark" : "light");
  $(".theme-toggle").setAttribute("aria-label", enabled ? "Switch to light theme" : "Switch to dark theme");
});

$("#year").textContent = new Date().getFullYear();
if (readStorageValue("rigwise-theme") === "dark") document.body.classList.add("dark-theme");
if (shared) {
  $("#build-status").textContent = workloadLabel(workload) + " shared build";
  showToast("Shared example build loaded.");
}
render();
if (!shared && quizPreferences) {
  $("#build-status").textContent = workloadLabel(workload) + " · questionnaire preferences";
  generateBuild();
}

