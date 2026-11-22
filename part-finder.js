import { COMPONENTS, PRODUCTS } from "./data.js";

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
let stepIndex = 0;
let budgetTouched = false;

const categories = new Map(COMPONENTS.map(component => [component.category, component]));
const money = value => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

function selectedCategory() {
  return form.querySelector('[name="category"]:checked')?.value || "";
}

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
  const inRange = Number.isFinite(amount) && amount >= 20 && amount <= 2000 && Number.isInteger(amount);
  if (!inRange) {
    budgetDisplay.textContent = "Enter €20–€2,000";
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
  submitButton.hidden = !lastStep;
  backButton.hidden = stepIndex === 0;
  nextButton.disabled = !stepIsValid(current);
  submitButton.disabled = !steps.every(stepIsValid);
  const hints = ["Pick the part you want.", "Set the maximum you want to spend on this part.", "Answer the questions for this part."];
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

function partPrice(product) {
  return Array.isArray(product.offers) && product.offers.length ? Math.min(...product.offers) : null;
}

function capacityGb(product) {
  return (Number(product.specs?.capacity) || 0) * 1000;
}

function meetsNeed(product, category, values) {
  if (category === "cpu") {
    const minimumTier = ["creative", "3d"].includes(values.get("workload")) ? 2 : 1;
    const socketMatches = values.get("socket") === "any" || product.specs?.socket === values.get("socket");
    return socketMatches && Number(product.specs?.tier) >= minimumTier;
  }
  if (category === "graphics") {
    const minimumTier = { any: 1, "1080p": 1, "1440p": 2, "4k": 3 }[values.get("resolution")];
    const seriesMatches = values.get("series") === "any" || product.series === values.get("series");
    return seriesMatches && Number(product.specs?.tier) >= minimumTier;
  }
  if (category === "memory") {
    const capacityMatches = values.get("capacity") === "any" || Number(product.specs?.capacity) >= Number(values.get("capacity"));
    const generationMatches = values.get("memoryGen") === "any" || product.specs?.memoryGen === values.get("memoryGen");
    return capacityMatches && generationMatches;
  }
  if (category === "storage") return capacityGb(product) >= Number(values.get("capacityGb"));
  if (category === "motherboard") {
    const socketMatches = values.get("socket") === "any" || product.specs?.socket === values.get("socket");
    const boardSize = product.specs?.sizeClass || (product.specs?.form === "mATX" ? "compact" : product.specs?.form === "ATX" ? "standard" : null);
    const sizeMatches = values.get("size") === "any" || boardSize === values.get("size");
    return socketMatches && sizeMatches;
  }
  if (category === "case") return values.get("size") === "any" || product.specs?.sizeClass === values.get("size");
  if (category === "power") return values.get("watts") === "any" || Number(product.specs?.watts) >= Number(values.get("watts"));
  if (category === "cooler") {
    const socketMatches = values.get("socket") === "any" || product.specs?.sockets?.includes(values.get("socket"));
    const capacityMatches = values.get("maxTdp") === "any" || Number(product.specs?.maxTdp) >= Number(values.get("maxTdp"));
    return socketMatches && capacityMatches;
  }
  return false;
}

function matchScore(product, category, values) {
  if (category === "cpu" || category === "graphics") return Number(product.specs?.tier) || 0;
  if (category === "memory") return -Math.abs(Number(product.specs?.capacity) - Number(values.get("capacity") === "any" ? 32 : values.get("capacity")));
  if (category === "storage") return -((capacityGb(product) - Number(values.get("capacityGb"))) / 1000);
  if (category === "power") return -Math.abs((Number(product.specs?.watts) || 0) - Number(values.get("watts") === "any" ? 650 : values.get("watts")));
  if (category === "cooler") return -Math.abs((Number(product.specs?.maxTdp) || 0) - Number(values.get("maxTdp") === "any" ? 120 : values.get("maxTdp")));
  return 0;
}

function resultCard(product, index, price, categoryLabel) {
  const image = product.imageUrl
    ? '<div class="part-finder-result-image"><img src="' + escapeHTML(product.imageUrl) + '" alt="" loading="lazy"></div>'
    : '<div class="part-finder-result-image" aria-hidden="true">' + escapeHTML(product.brand?.slice(0, 2) || categoryLabel.slice(0, 2)) + '</div>';
  const source = product.sourceUrl
    ? '<a href="' + escapeHTML(product.sourceUrl) + '" target="_blank" rel="noreferrer">Product specifications ↗</a>'
    : "";
  const brand = [product.brand, product.series].filter(Boolean).join(" · ") || "Example part";
  return '<article class="part-finder-result-card">' + image + '<div class="part-finder-result-copy"><small>' + (index === 0 ? "BEST MATCH · " : "") + escapeHTML(brand) + '</small><strong>' + escapeHTML(product.name) + '</strong><small>' + escapeHTML(product.detail || "Specifications not recorded") + '</small>' + source + '</div><div class="part-finder-result-price">' + money(price) + '<small>example price</small></div></article>';
}

function showResults() {
  const values = new FormData(form);
  const category = values.get("category");
  const categoryInfo = categories.get(category);
  const maxBudget = Number(budgetNumber.value);
  const matches = PRODUCTS
    .filter(product => product.category === category)
    .map(product => ({ product, price: partPrice(product) }))
    .filter(item => item.price !== null && item.price <= maxBudget && meetsNeed(item.product, category, values))
    .sort((a,b) => matchScore(b.product, category, values) - matchScore(a.product, category, values) || a.price - b.price);
  const belowBudget = PRODUCTS.filter(product => product.category === category && partPrice(product) !== null && partPrice(product) <= maxBudget);
  document.querySelector("#part-finder-results-title").textContent = categoryInfo.label + (matches.length ? " matches" : "");
  document.querySelector("#part-finder-results-note").textContent = matches.length
    ? matches.length + " example " + (matches.length === 1 ? "option" : "options") + " within " + money(maxBudget) + ". Prices are estimates, not live offers."
    : belowBudget.length
      ? "No example part under " + money(maxBudget) + " meets every requirement. Raise the budget or relax one requirement."
      : "No example " + categoryInfo.label.toLowerCase() + " is listed under " + money(maxBudget) + ". Raise your budget to see the current sample options.";
  resultsList.innerHTML = matches.map((item,index) => resultCard(item.product,index,item.price,categoryInfo.label)).join("");
  if (!matches.length) resultsList.innerHTML = '<div class="part-finder-empty">Try a different requirement or budget. The catalogue contains example parts only.</div>';
  form.hidden = true;
  resultsSection.hidden = false;
  resultsSection.querySelector("h2").focus();
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
      ? "This budget is for one component only. Your whole PC and accessories have separate budgets."
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
  if (resultsWereOpen) showResults();
  else needsFields.querySelector("[required]")?.focus();
}

document.querySelectorAll("[data-part-help-open]").forEach(button => button.addEventListener("click", openHelp));
document.querySelector("#part-finder-help-close").addEventListener("click", () => helpDialog.close());
flexibleButton.addEventListener("click", useFlexibleAnswers);

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
