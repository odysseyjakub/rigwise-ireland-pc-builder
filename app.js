import { BUNDLES, COMPONENTS, COUNTIES, DEFAULT_BUILD, OFFERS, PRODUCTS, RETAILERS, SHIPPING_RULES } from "./data.js";
import { checkCompatibility } from "./compatibility.js";
import { generateAutoBuild } from "./auto-build.js";
import { compareCatalogProducts, PRODUCT_CATEGORIES } from "./comparison.js";
import { cheapestItemPlan, optimizeBasket } from "./optimizer.js";

const $ = selector => document.querySelector(selector);
const money = value => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(value);
const productById = id => PRODUCTS.find(product => product.id === id);
const STORAGE_KEY = "rigwise-demo-builds-v1";
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
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.filter(item => item && item.build && typeof item.name === "string") : [];
  } catch {
    return [];
  }
}

function fromShareHash() {
  if (!location.hash.startsWith("#build=")) return null;
  try {
    const encoded = location.hash.slice(7).replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(decodeURIComponent(escape(atob(encoded))));
    if (!decoded || !decoded.build || !COMPONENTS.every(component => PRODUCTS.some(product => product.id === decoded.build[component.id] && product.category === component.category))) return null;
    return { ...decoded, county: COUNTIES.includes(decoded.county) ? decoded.county : undefined };
  } catch {
    return null;
  }
}

const shared = fromShareHash();
let build = shared?.build ? { ...DEFAULT_BUILD, ...shared.build } : { ...DEFAULT_BUILD };
let budget = Number(shared?.budget) || 1000;
let workload = shared?.workload || "gaming";
let county = COUNTIES.includes(shared?.county)
  ? shared.county
  : COUNTIES.includes(localStorage.getItem("rigwise-county"))
    ? localStorage.getItem("rigwise-county")
    : "Dublin";
let expanded = new Set();
let toastTimer;

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
    strategy: $("#strategy").value
  });
}

function renderLocationNote() {
  $("#location-note").textContent = county + " selected · demo shipping rules are county-neutral";
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
  const query = $("#part-search").value.trim().toLocaleLowerCase("en-IE");
  const filtered = buildItems().filter(item => {
    const product = productById(item.productId);
    return !query || item.label.toLocaleLowerCase("en-IE").includes(query) || product.name.toLocaleLowerCase("en-IE").includes(query);
  });
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
  if (filtered.length === 0) $("#parts-list").innerHTML = '<div class="empty-search">No component matches “' + escapeHTML(query) + '”. Try “memory” or clear your search.</div>';
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
  const saved = readSavedBuilds();
  host.hidden = saved.length === 0;
  host.innerHTML = saved.length ? '<div class="saved-heading"><span>BUILDS SAVED ON THIS DEVICE</span><button type="button" data-clear-saved class="saved-clear">Clear all</button></div><div class="saved-list">' +
    saved.map(item => '<div class="saved-item"><button type="button" data-load-saved="' + item.id + '" class="saved-name">' + escapeHTML(item.name) + '<small>' + new Date(item.createdAt).toLocaleDateString("en-IE") + ' · illustrative total ' + money(Number(item.total) || 0) + '</small></button><button type="button" class="saved-remove" data-remove-saved="' + item.id + '" aria-label="Remove ' + escapeHTML(item.name) + '">×</button></div>').join("") + '</div>' : "";
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
  renderCompatibility();
  renderSavedBuilds();
  renderComparison();
  $("#budget").value = budget;
  $("#budget-range").value = Math.max(700, Math.min(3000, budget));
  $("#workload").value = workload;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("toast-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("toast-visible"), 2600);
}

function saveBuild() {
  const plan = currentPlan();
  const saved = readSavedBuilds();
  const item = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    name: workloadLabel(workload) + " · " + new Date().toLocaleDateString("en-IE"),
    build: { ...build },
    budget,
    workload,
    county,
    total: plan.total,
    createdAt: new Date().toISOString()
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([item, ...saved].slice(0, 8)));
    renderSavedBuilds();
    showToast("Build saved in this browser.");
  } catch {
    showToast("Your browser could not save this build.");
  }
}

function workloadLabel(value) {
  return value === "creative" ? "Creative" : value === "everyday" ? "Everyday" : "Gaming";
}

function shareBuild() {
  const payload = { build, budget, workload, county };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  const url = location.origin + location.pathname + "#build=" + encoded;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).then(() => showToast("Share link copied.")).catch(() => showToast("Copy the link from your browser address bar after sharing."));
  } else {
    showToast("Share the page URL to send this build.");
  }
}

function generateBuild() {
  budget = Math.max(700, Math.min(5000, Number($("#budget").value) || 1000));
  $("#budget").value = budget;
  const result = generateAutoBuild({
    budget,
    workload,
    components: COMPONENTS,
    products: PRODUCTS,
    offers: OFFERS,
    bundles: BUNDLES,
    shippingRules: SHIPPING_RULES
  });
  if (result.status !== "ready") {
    const message = result.minimumCompatibleTotal === null
      ? "No complete compatible example build could be made from this demo catalogue."
      : "The lowest compatible example build is " + money(result.minimumCompatibleTotal) + ", above this budget.";
    showToast(message);
    return;
  }
  build = result.build;
  expanded.clear();
  $("#build-status").textContent = workloadLabel(workload) + " build · best sample fit for budget";
  render();
  showToast("A compatible sample build fits your budget. No benchmark data is connected.");
}

$("#parts-list").addEventListener("change", event => {
  const component = event.target.dataset.component;
  if (!component) return;
  build[component] = event.target.value;
  $("#build-status").textContent = workloadLabel(workload) + " build · manually configured";
  render();
});

$("#parts-list").addEventListener("click", event => {
  const button = event.target.closest("[data-expand]");
  if (!button) return;
  const id = button.dataset.expand;
  if (expanded.has(id)) expanded.delete(id);
  else expanded.add(id);
  render();
  $("#select-" + id)?.focus({ preventScroll: true });
});

$("#part-search").addEventListener("input", () => renderParts(currentPlan()));
$("#compare-category").addEventListener("change", () => {
  syncComparisonSelectors();
  renderComparison();
});
for (const id of ["compare-one", "compare-two", "compare-three"]) {
  $("#" + id).addEventListener("change", renderComparison);
}
$("#strategy").addEventListener("change", render);
$("#budget").addEventListener("change", () => {
  budget = Math.max(700, Math.min(5000, Number($("#budget").value) || 1000));
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
});
$("#county").addEventListener("change", event => {
  county = COUNTIES.includes(event.target.value) ? event.target.value : "Dublin";
  try { localStorage.setItem("rigwise-county", county); } catch {}
  renderLocationNote();
});
$("#generate-build").addEventListener("click", generateBuild);
$("#save-build").addEventListener("click", saveBuild);
$("#share-build").addEventListener("click", shareBuild);

$("#saved-builds").addEventListener("click", event => {
  const target = event.target.closest("[data-load-saved], [data-remove-saved], [data-clear-saved]");
  if (!target) return;
  const saved = readSavedBuilds();
  if (target.hasAttribute("data-load-saved")) {
    const item = saved.find(entry => entry.id === target.dataset.loadSaved);
    if (item) {
      build = { ...item.build };
      budget = Number(item.budget) || 1000;
      workload = item.workload || "gaming";
      county = COUNTIES.includes(item.county) ? item.county : "Dublin";
      $("#county").value = county;
      try { localStorage.setItem("rigwise-county", county); } catch {}
      $("#build-status").textContent = escapeHTML(item.name) + " · restored";
      render();
      showToast("Saved build loaded.");
    }
  } else if (target.hasAttribute("data-remove-saved")) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved.filter(item => item.id !== target.dataset.removeSaved)));
    renderSavedBuilds();
  } else {
    localStorage.removeItem(STORAGE_KEY);
    renderSavedBuilds();
  }
});

$(".theme-toggle").addEventListener("click", () => {
  const enabled = document.body.classList.toggle("dark-theme");
  localStorage.setItem("rigwise-theme", enabled ? "dark" : "light");
  $(".theme-toggle").setAttribute("aria-label", enabled ? "Switch to light theme" : "Switch to dark theme");
});

$("#year").textContent = new Date().getFullYear();
if (localStorage.getItem("rigwise-theme") === "dark") document.body.classList.add("dark-theme");
$("#county").value = county;
syncComparisonSelectors();
renderLocationNote();
if (shared) {
  $("#build-status").textContent = workloadLabel(workload) + " shared build";
  showToast("Shared example build loaded.");
}
render();

