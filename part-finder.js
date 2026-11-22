import { COMPONENTS } from "./data.js";
import { fetchLiveParts, MARKET_SOURCE } from "./live-market-data.js";

const form = document.querySelector("#part-finder-form");
const steps = [...form.querySelectorAll("[data-part-step]")];
const budgetRange = document.querySelector("#part-budget-range");
const budgetNumber = document.querySelector("#part-budget-number");
const budgetDisplay = document.querySelector("#part-budget-display");
const nextButton = document.querySelector("#part-finder-next");
const submitButton = document.querySelector("#part-finder-submit");
const backButton = document.querySelector("#part-finder-back");
const resultsSection = document.querySelector("#part-finder-results");
const resultsList = document.querySelector("#part-finder-result-list");
const needsFields = document.querySelector("#part-needs-fields");
const helpDialog = document.querySelector("#part-finder-help");
const helpContext = document.querySelector("#part-finder-help-context");
const flexibleButton = document.querySelector("#part-finder-flexible");
const budgetTitle = document.querySelector("#part-budget-title");
const marketNote = document.querySelector("#part-market-note");
const marketButtons = [...document.querySelectorAll("[data-part-market]")];
const refreshButton = document.querySelector("#part-finder-refresh");
let stepIndex = 0;
let budgetTouched = false;
let activeMarket = "IE";
let searchSequence = 0;

const categories = new Map(COMPONENTS.map(component => [component.category, component]));
const money = value => new Intl.NumberFormat(activeMarket === "UK" ? "en-GB" : "en-IE", { style: "currency", currency: activeMarket === "UK" ? "GBP" : "EUR", maximumFractionDigits: 2 }).format(value);
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const timeLabel = value => new Intl.DateTimeFormat(activeMarket === "UK" ? "en-GB" : "en-IE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

function selectedCategory() {
  return form.querySelector('[name="category"]:checked')?.value || "";
}

function setMarket(value, persist = true) {
  const resultsWereOpen = !resultsSection.hidden;
  activeMarket = value === "UK" ? "UK" : "IE";
  if (persist) {
    try { localStorage.setItem("rigwise-market", activeMarket); } catch { /* keep this choice for this page only */ }
  }
  document.documentElement.lang = activeMarket === "UK" ? "en-GB" : "en-IE";
  marketButtons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.partMarket === activeMarket)));
  const isUk = activeMarket === "UK";
  budgetTitle.textContent = "What is your budget for this part?";
  document.querySelector("#part-budget-min-label").textContent = money(Number(budgetRange.min));
  document.querySelector("#part-budget-max-label").textContent = money(Number(budgetRange.max));
  if (budgetNumber.value) updateBudget(budgetNumber.value, false, "number");
  marketNote.textContent = isUk
    ? "VantaSpec's UK catalogue is fetched when you search. Its price-check dates are not provided; confirm price and stock before buying. Delivery is a published seller rule where linked, or a labeled estimate."
    : "Ireland mode checks UK listings against Republic of Ireland delivery rules. GBP prices use a dated ECB rate and an Irish VAT estimate. The current product source does not list EU-only retailers.";
  syncNavigation();
  if (resultsWereOpen) {
    void showResults({ forceRefresh: true });
  }
}

marketButtons.forEach(button => button.addEventListener("click", () => setMarket(button.dataset.partMarket)));
try { setMarket(localStorage.getItem("rigwise-market") || "IE", false); } catch { setMarket("IE", false); }

function renderNeedsFields(category) {
  const fields = {
    cpu: '<label>CPU platform / generation<select class="select-control" name="socket" required><option value="" selected disabled>Choose a platform</option><option value="any">No preference — show best fits</option><option value="AM4">AM4 · Ryzen 5000</option><option value="AM5">AM5 · Ryzen 7000</option></select></label><label>Primary use<select class="select-control" name="workload" required><option value="" selected disabled>Choose a use</option><option value="any">A bit of everything</option><option value="gaming">Gaming</option><option value="streaming">Gaming and streaming</option><option value="creative">Creative work</option><option value="3d">3D and development</option><option value="everyday">Everyday use</option></select></label>',
    graphics: '<label>GPU generation<select class="select-control" name="series" required><option value="" selected disabled>Choose a generation</option><option value="any">No preference — show best fits</option><option value="Radeon RX 7000">AMD Radeon RX 7000</option><option value="GeForce RTX 40">NVIDIA GeForce RTX 40</option></select></label><label>Target resolution<select class="select-control" name="resolution" required><option value="" selected disabled>Choose a resolution</option><option value="any">Not sure — show balanced options</option><option value="1080p">1080p</option><option value="1440p">1440p</option><option value="4k">4K</option></select></label>',
    memory: '<label>Capacity needed<select class="select-control" name="capacity" required><option value="" selected disabled>Choose capacity</option><option value="any">Not sure — show balanced options</option><option value="16">16 GB</option><option value="32">32 GB</option><option value="64">64 GB</option></select></label><label>Memory generation<select class="select-control" name="memoryGen" required><option value="" selected disabled>Choose generation</option><option value="any">Not sure — show DDR4 and DDR5</option><option value="DDR4">DDR4</option><option value="DDR5">DDR5</option></select></label>',
    storage: '<label>Capacity needed in GB<input name="capacityGb" type="number" min="256" max="8000" step="1" inputmode="numeric" placeholder="e.g. 512" required></label>',
    motherboard: '<label>Processor platform<select class="select-control" name="socket" required><option value="" selected disabled>Choose platform</option><option value="any">Not sure — show both</option><option value="AM4">AM4 · Ryzen 5000</option><option value="AM5">AM5 · Ryzen 7000</option></select></label><label>Board size<select class="select-control" name="size" required><option value="" selected disabled>Choose size</option><option value="any">Not sure — show all sizes</option><option value="standard">ATX</option><option value="compact">Micro-ATX</option></select></label>',
    case: '<label>Case size<select class="select-control" name="size" required><option value="" selected disabled>Choose size</option><option value="any">Not sure — show compatible sizes</option><option value="standard">Standard tower</option><option value="compact">Compact tower</option></select></label>',
    power: '<label>Minimum wattage<select class="select-control" name="watts" required><option value="" selected disabled>Choose wattage</option><option value="any">Not sure — show balanced options</option><option value="550">550 W</option><option value="650">650 W</option><option value="850">850 W</option></select></label>',
    cooler: '<label>Processor platform<select class="select-control" name="socket" required><option value="" selected disabled>Choose platform</option><option value="any">Not sure — show both</option><option value="AM4">AM4 · Ryzen 5000</option><option value="AM5">AM5 · Ryzen 7000</option></select></label><label>Cooling capacity<select class="select-control" name="maxTdp" required><option value="" selected disabled>Choose capacity</option><option value="any">Not sure — show balanced options</option><option value="95">Up to 95 W</option><option value="120">Up to 120 W</option><option value="160">Up to 160 W</option></select></label>'
  };
  needsFields.innerHTML = fields[category] || "";
  const title = document.querySelector("#part-needs-title");
  const label = categories.get(category)?.label || "part";
  title.textContent = "What matters for your " + label.toLowerCase() + "?";
  syncNavigation();
}

function updateBudget(value, touched = true, source = "number") {
  const raw = String(value ?? "");
  if (source === "number") budgetNumber.value = raw;
  if (touched) budgetTouched = true;

  if (!raw.trim()) {
    budgetDisplay.textContent = "Enter an amount";
    syncNavigation();
    return;
  }

  const amount = Number(raw);
  const inRange = Number.isFinite(amount) && amount >= 20 && amount <= 3000 && Number.isInteger(amount);
  if (!inRange) {
    budgetDisplay.textContent = "Enter " + money(20) + "–" + money(3000);
    syncNavigation();
    return;
  }

  budgetRange.value = String(amount);
  budgetDisplay.textContent = money(amount);
  syncNavigation();
}

function stepIsValid(step) {
  if (step.dataset.partStep === "category") return Boolean(selectedCategory());
  if (step.dataset.partStep === "budget") return budgetTouched && budgetNumber.checkValidity();
  if (step.dataset.partStep === "needs") return [...needsFields.querySelectorAll("[required]")].every(field => String(field.value).trim() !== "");
  return false;
}

function syncNavigation() {
  const current = steps[stepIndex];
  const lastStep = stepIndex === steps.length - 1;
  nextButton.hidden = lastStep;
  nextButton.textContent = "Next";
  submitButton.hidden = !lastStep;
  backButton.hidden = stepIndex === 0;
  nextButton.disabled = !stepIsValid(current);
  submitButton.disabled = !steps.every(stepIsValid);
  const hints = ["Pick the part you want.", "Set the maximum you want to spend on this part and its estimated delivery.", "Answer the questions for this part."];
  document.querySelector("#part-finder-hint").textContent = stepIsValid(current) ? "Ready for the next step." : hints[stepIndex];
}

function renderStep(focus = false) {
  steps.forEach((step, index) => { step.hidden = index !== stepIndex; });
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);
  document.querySelector("#part-finder-progress").textContent = "Step " + (stepIndex + 1) + " of " + steps.length;
  document.querySelector("#part-finder-progress-fill").style.width = progress + "%";
  document.querySelector(".part-finder-main .quiz-progress-track").setAttribute("aria-valuenow", String(progress));
  document.querySelector("#part-finder-error").hidden = true;
  syncNavigation();
  if (focus) steps[stepIndex].querySelector("legend")?.focus();
}

function safeImage(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch { return ""; }
}

function chooseOffer(product, maxBudget) {
  return product.offers.find(offer => offer.inStock && offer.deliveredPrice !== null && offer.deliveredPrice <= maxBudget)
    || product.offers.find(offer => offer.inStock && offer.deliveredPrice !== null)
    || product.offers.find(offer => offer.deliveredPrice !== null)
    || product.offers[0];
}

function deliveryLinks(offer) {
  const links = [];
  if (offer.deliverySourceUrl) links.push('<a href="' + escapeHTML(offer.deliverySourceUrl) + '" target="_blank" rel="noopener noreferrer">Delivery policy ↗</a>');
  if (offer.deliveryReferenceUrls?.length) {
    offer.deliveryReferenceUrls.forEach((url, index) => links.push('<a href="' + escapeHTML(url) + '" target="_blank" rel="noopener noreferrer">Estimate source ' + (index + 1) + ' ↗</a>'));
  }
  return links.join(" ");
}

function offerMarkup(offer) {
  const stock = offer.inStock ? "In stock per source" : offer.stockKnown ? "Source marks out of stock" : "Stock not confirmed";
  const item = offer.itemPrice === null ? "Item price unavailable" : "Item " + money(offer.itemPrice);
  const delivery = offer.shippingPrice === null ? "Delivery unavailable" : (offer.deliveryType === "estimate" ? "Est. delivery " : "Delivery ") + money(offer.shippingPrice);
  const total = offer.deliveredPrice === null ? "Delivered total unavailable" : (offer.deliveryType === "estimate" || activeMarket === "IE" ? "Est. total " : "Total ") + money(offer.deliveredPrice);
  const destinationNote = activeMarket === "IE" && !offer.destinationConfirmed ? '<span class="part-offer-warning">ROI delivery not confirmed</span>' : "";
  const deliveryLabel = offer.deliveryType === "published" ? "Published fee" : offer.deliveryType === "estimate" ? "Estimated fee" : "Fee unavailable";
  const policyLinks = deliveryLinks(offer);
  const buy = offer.buyUrl ? '<a class="part-offer-buy" href="' + escapeHTML(offer.buyUrl) + '" target="_blank" rel="noopener noreferrer">Check retailer ↗</a>' : "";
  return '<li class="part-offer-row"><div class="part-offer-main"><strong>' + escapeHTML(offer.retailer) + '</strong><small>' + escapeHTML(stock) + '</small>' + destinationNote + '</div><div class="part-offer-cost"><span>' + escapeHTML(item) + '</span><span class="' + (offer.deliveryType === "estimate" ? "is-estimate" : "") + '">' + escapeHTML(delivery) + ' · ' + deliveryLabel + '</span><strong>' + escapeHTML(total) + '</strong></div><div class="part-offer-links">' + policyLinks + buy + '</div><p class="part-offer-disclaimer">' + escapeHTML(offer.deliveryDetails) + '</p></li>';
}

function resultCard(product, index, maxBudget) {
  const best = chooseOffer(product, maxBudget);
  const imageUrl = safeImage(product.imageUrl);
  const image = imageUrl
    ? '<div class="part-finder-result-image"><img src="' + escapeHTML(imageUrl) + '" alt="" loading="lazy"></div>'
    : '<div class="part-finder-result-image" aria-hidden="true">' + escapeHTML(product.brand?.slice(0, 2) || "PC") + '</div>';
  const total = best?.deliveredPrice === null || !best ? "Check price" : money(best.deliveredPrice);
  const totalLabel = !best ? "No price" : best.deliveryType === "published" && activeMarket === "UK" ? "item + published delivery" : "estimated delivered";
  const sourceLink = '<a href="' + escapeHTML(MARKET_SOURCE.api) + '" target="_blank" rel="noopener noreferrer">Price data: VantaSpec ↗</a>';
  const status = product.needStatus === "check" ? '<span class="part-match-badge is-caution">Check compatibility</span>' : '<span class="part-match-badge">' + (index === 0 ? "Closest match" : "Matches your settings") + '</span>';
  const overBudget = best?.deliveredPrice !== null && best?.deliveredPrice > maxBudget ? '<span class="part-match-badge is-caution">Above budget</span>' : "";
  const offers = product.offers.slice(0, 8);
  const offerSummary = offers.length + " seller " + (offers.length === 1 ? "offer" : "offers");
  const compare = offers.length
    ? '<details class="part-offer-details"><summary>Compare ' + escapeHTML(offerSummary) + '</summary><ul class="part-offer-list">' + offers.map(offerMarkup).join("") + '</ul></details>'
    : '<p class="part-offer-disclaimer">No seller price was returned for this listing.</p>';
  return '<article class="part-finder-result-card live-part-card">' + image + '<div class="part-finder-result-copy"><div class="part-result-badges">' + status + overBudget + '</div><small>' + escapeHTML(product.brand || "PC component") + ' · ' + (product.needStatus === "check" ? "Source specs need checking" : "Sourced catalogue result") + '</small><strong>' + escapeHTML(product.name) + '</strong><small>' + escapeHTML(product.specs) + '</small>' + sourceLink + '</div><div class="part-finder-result-price">' + escapeHTML(total) + '<small>' + escapeHTML(totalLabel) + '</small>' + (best ? '<small>' + escapeHTML(best.retailer) + '</small>' : "") + '</div><div class="part-result-offers">' + compare + '</div></article>';
}

function loadingResults(categoryLabel) {
  document.querySelector("#part-finder-results-title").textContent = categoryLabel + " matches";
  document.querySelector("#part-finder-results-note").textContent = "Fetching catalogue results and delivery estimates…";
  resultsList.innerHTML = '<div class="part-finder-empty" role="status">Searching VantaSpec. This can take a few seconds.</div>';
}

async function showResults({ forceRefresh = false } = {}) {
  const sequence = ++searchSequence;
  const values = new FormData(form);
  const category = values.get("category");
  const categoryInfo = categories.get(category);
  const maxBudget = Number(budgetNumber.value);
  form.hidden = true;
  resultsSection.hidden = false;
  refreshButton.disabled = true;
  refreshButton.textContent = "Refreshing…";
  loadingResults(categoryInfo.label);
  try {
    const data = await fetchLiveParts(category, values, activeMarket, { force: forceRefresh });
    if (sequence !== searchSequence) return;
    const budgetMatches = data.products.filter(product => product.offers.some(offer => offer.deliveredPrice !== null && offer.deliveredPrice <= maxBudget));
    const matches = (budgetMatches.length ? budgetMatches : data.products)
      .sort((a, b) => {
        const offerA = chooseOffer(a, maxBudget);
        const offerB = chooseOffer(b, maxBudget);
        const aInBudget = offerA?.deliveredPrice !== null && offerA?.deliveredPrice <= maxBudget;
        const bInBudget = offerB?.deliveredPrice !== null && offerB?.deliveredPrice <= maxBudget;
        if (aInBudget !== bInBudget) return aInBudget ? -1 : 1;
        if (offerA?.deliveryVerified !== offerB?.deliveryVerified) return offerA?.deliveryVerified ? -1 : 1;
        if (offerA?.inStock !== offerB?.inStock) return offerA?.inStock ? -1 : 1;
        return (offerA?.deliveredPrice ?? Infinity) - (offerB?.deliveredPrice ?? Infinity);
      }).slice(0, 12);

    document.querySelector("#part-finder-results-title").textContent = categoryInfo.label + (budgetMatches.length ? " matches" : " options");
    const fetched = timeLabel(data.fetchedAt);
    const sourceAttribution = '<a href="' + escapeHTML(MARKET_SOURCE.api) + '" target="_blank" rel="noopener noreferrer">VantaSpec UK catalogue</a>';
    const fxNote = activeMarket === "IE" && data.exchangeRate
      ? ' GBP converted at the ECB reference rate (' + escapeHTML(data.exchangeRate.rate.toFixed(4)) + ' EUR/GBP, ' + escapeHTML(data.exchangeRate.date) + '). Irish item prices assume UK gross prices include 20% VAT and are recalculated at Ireland’s 23% standard rate.'
      : "";
    const coverageNote = activeMarket === "IE"
      ? " This source currently provides UK shops only; it does not yet supply EU-only retailer offers."
      : "";
    const budgetNote = budgetMatches.length
      ? budgetMatches.length + " option" + (budgetMatches.length === 1 ? "" : "s") + " at or below " + money(maxBudget) + " including delivery."
      : "No returned offer fits " + money(maxBudget) + " including the delivery estimate; showing the closest listings. ";
    document.querySelector("#part-finder-results-note").innerHTML = budgetNote + " Fetched " + escapeHTML(fetched) + " from " + sourceAttribution + ". The source does not provide each retailer price’s original check time; verify price and stock at checkout. Published delivery rules are linked; estimates are marked and may be wrong." + escapeHTML(fxNote + coverageNote);
    resultsList.innerHTML = matches.map((product, index) => resultCard(product, index, maxBudget)).join("");
    if (!matches.length) {
      resultsList.innerHTML = '<div class="part-finder-empty">No current listings matched that search. Try “Not sure” settings or refresh the offers. No sample prices have been substituted.</div>';
      document.querySelector("#part-finder-results-note").innerHTML = "No products were returned by the " + sourceAttribution + ". This search is not filled with sample products." + escapeHTML(coverageNote);
    }
    resultsSection.querySelector("h2").focus();
  } catch (error) {
    if (sequence !== searchSequence) return;
    document.querySelector("#part-finder-results-title").textContent = "Couldn’t load current listings";
    document.querySelector("#part-finder-results-note").textContent = error instanceof Error ? error.message : "The product source is unavailable.";
    resultsList.innerHTML = '<div class="part-finder-empty">Try refreshing. Rigwise will not replace unavailable live data with sample prices.</div>';
  } finally {
    if (sequence === searchSequence) {
      refreshButton.disabled = false;
      refreshButton.textContent = "Refresh offers";
    }
  }
}

const helpByCategory = {
  cpu: "AM4 and AM5 are different CPU platforms. If this is an upgrade, check your motherboard model first; choosing any platform shows both, but they are not interchangeable.",
  graphics: "1080p, 1440p and 4K describe your screen resolution. If you are unsure, show balanced options and compare the listed GPU model.",
  memory: "DDR4 and DDR5 are different generations and do not fit the same motherboard. If you are upgrading, check your board or choose both to compare.",
  storage: "Storage is long-term space for your games and files. 1 TB is a useful starting point; choose a larger amount if you keep many large games or videos.",
  motherboard: "The board must match your CPU platform and fit your case. If you already own a CPU, check whether it is AM4 or AM5 before ordering.",
  case: "Case size affects which motherboard and graphics cards fit. If you are unsure, show both sizes and check the listed clearance before buying.",
  power: "Power supplies are sized for the whole PC, not just one part. A balanced option gives the rest of the system room to run.",
  cooler: "The cooler must fit the CPU socket and handle its heat output. Check the CPU model if you are replacing a cooler."
};

function openHelp() {
  const step = steps[stepIndex].dataset.partStep;
  const category = selectedCategory();
  helpContext.textContent = step === "category"
    ? "Choose the part you want to add or replace. If you need a complete computer, start in Build instead."
    : step === "budget"
      ? "This budget covers one component and its estimated delivery only. The final checkout amount may differ."
      : helpByCategory[category] || "Choose the details you know. Any field marked “Not sure” will show a wider set of options.";
  flexibleButton.disabled = step !== "needs";
  flexibleButton.textContent = step === "needs" ? "Show flexible matches" : "Choose a part and budget first";
  helpDialog.showModal();
  document.querySelector("#part-finder-help-close").focus();
}

function useFlexibleAnswers() {
  if (steps[stepIndex].dataset.partStep !== "needs") return;
  const resultsWereOpen = !resultsSection.hidden;
  needsFields.querySelectorAll("select[required]").forEach(select => {
    if ([...select.options].some(option => option.value === "any")) select.value = "any";
  });
  const storageCapacity = needsFields.querySelector('[name="capacityGb"]');
  if (storageCapacity) storageCapacity.value = "1000";
  helpDialog.close();
  syncNavigation();
  if (resultsWereOpen) void showResults();
  else needsFields.querySelector("[required]")?.focus();
}

document.querySelectorAll("[data-part-help-open]").forEach(button => button.addEventListener("click", openHelp));
document.querySelector("#part-finder-help-close").addEventListener("click", () => helpDialog.close());
flexibleButton.addEventListener("click", useFlexibleAnswers);
refreshButton.addEventListener("click", () => { void showResults({ forceRefresh: true }); });

function startOver() {
  form.reset();
  stepIndex = 0;
  budgetTouched = false;
  budgetDisplay.textContent = "Choose an amount";
  needsFields.replaceChildren();
  resultsSection.hidden = true;
  form.hidden = false;
  renderStep(true);
}

form.addEventListener("change", event => {
  if (event.target.name === "category") renderNeedsFields(selectedCategory());
  syncNavigation();
});
budgetRange.addEventListener("input", () => {
  budgetNumber.value = budgetRange.value;
  updateBudget(budgetRange.value, true, "range");
});
budgetNumber.addEventListener("input", () => updateBudget(budgetNumber.value, true, "number"));
needsFields.addEventListener("input", syncNavigation);
needsFields.addEventListener("change", syncNavigation);

nextButton.addEventListener("click", () => {
  if (!stepIsValid(steps[stepIndex])) {
    document.querySelector("#part-finder-error").textContent = "Choose an answer before continuing.";
    document.querySelector("#part-finder-error").hidden = false;
    return;
  }
  stepIndex += 1;
  renderStep(true);
});
backButton.addEventListener("click", () => {
  stepIndex = Math.max(0, stepIndex - 1);
  renderStep(true);
});
form.addEventListener("submit", event => {
  event.preventDefault();
  if (!steps.every(stepIsValid)) {
    const firstInvalid = steps.findIndex(step => !stepIsValid(step));
    stepIndex = Math.max(firstInvalid, 0);
    renderStep(true);
    document.querySelector("#part-finder-error").textContent = "Complete each step to see the part matches.";
    document.querySelector("#part-finder-error").hidden = false;
    return;
  }
  showResults();
});
document.querySelector("#part-finder-edit").addEventListener("click", () => {
  resultsSection.hidden = true;
  form.hidden = false;
  stepIndex = steps.length - 1;
  renderStep(true);
});
document.querySelector("#part-finder-reset").addEventListener("click", startOver);


renderStep();
