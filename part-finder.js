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
    cpu: '<label>CPU platform / generation<select class="select-control" name="socket" required><option value="" selected disabled>Choose a platform</option><option value="AM4">AM4 · Ryzen 5000</option><option value="AM5">AM5 · Ryzen 7000</option></select></label><label>Primary use<select class="select-control" name="workload" required><option value="" selected disabled>Choose a use</option><option value="gaming">Gaming</option><option value="streaming">Gaming and streaming</option><option value="creative">Creative work</option><option value="3d">3D and development</option><option value="everyday">Everyday use</option></select></label>',
    graphics: '<label>GPU generation<select class="select-control" name="series" required><option value="" selected disabled>Choose a generation</option><option value="Radeon RX 7000">AMD Radeon RX 7000</option><option value="GeForce RTX 40">NVIDIA GeForce RTX 40</option></select></label><label>Target resolution<select class="select-control" name="resolution" required><option value="" selected disabled>Choose a resolution</option><option value="1080p">1080p</option><option value="1440p">1440p</option><option value="4k">4K</option></select></label>',
    memory: '<label>Capacity needed<select class="select-control" name="capacity" required><option value="" selected disabled>Choose capacity</option><option value="16">16 GB</option><option value="32">32 GB</option><option value="64">64 GB</option></select></label><label>Memory generation<select class="select-control" name="memoryGen" required><option value="" selected disabled>Choose generation</option><option value="DDR4">DDR4</option><option value="DDR5">DDR5</option></select></label>',
    storage: '<label>Capacity needed in GB<input name="capacityGb" type="number" min="256" max="8000" step="1" inputmode="numeric" placeholder="e.g. 512" required></label>',
    motherboard: '<label>Processor platform<select class="select-control" name="socket" required><option value="" selected disabled>Choose platform</option><option value="AM4">AM4</option><option value="AM5">AM5</option></select></label><label>Board size<select class="select-control" name="size" required><option value="" selected disabled>Choose size</option><option value="any">Any</option><option value="compact">Compact</option></select></label>',
    case: '<label>Case size<select class="select-control" name="size" required><option value="" selected disabled>Choose size</option><option value="any">Standard</option><option value="compact">Compact</option></select></label>',
    power: '<label>Minimum wattage<select class="select-control" name="watts" required><option value="" selected disabled>Choose wattage</option><option value="550">550 W</option><option value="650">650 W</option><option value="850">850 W</option></select></label>',
    cooler: '<label>Processor platform<select class="select-control" name="socket" required><option value="" selected disabled>Choose platform</option><option value="AM4">AM4</option><option value="AM5">AM5</option></select></label><label>Cooling capacity<select class="select-control" name="maxTdp" required><option value="" selected disabled>Choose capacity</option><option value="95">Up to 95 W</option><option value="120">Up to 120 W</option><option value="160">Up to 160 W</option></select></label>'
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
    return product.specs?.socket === values.get("socket") && Number(product.specs?.tier) >= minimumTier;
  }
  if (category === "graphics") {
    const minimumTier = { "1080p": 1, "1440p": 2, "4k": 3 }[values.get("resolution")];
    return product.series === values.get("series") && Number(product.specs?.tier) >= minimumTier;
  }
  if (category === "memory") {
    return Number(product.specs?.capacity) >= Number(values.get("capacity")) && product.specs?.memoryGen === values.get("memoryGen");
  }
  if (category === "storage") return capacityGb(product) >= Number(values.get("capacityGb"));
  if (category === "motherboard") {
    return product.specs?.socket === values.get("socket") && (values.get("size") !== "compact" || product.specs?.sizeClass === "compact");
  }
  if (category === "case") return values.get("size") !== "compact" || product.specs?.sizeClass === "compact";
  if (category === "power") return Number(product.specs?.watts) >= Number(values.get("watts"));
  if (category === "cooler") return product.specs?.sockets?.includes(values.get("socket")) && Number(product.specs?.maxTdp) >= Number(values.get("maxTdp"));
  return false;
}

function matchScore(product, category, values) {
  if (category === "cpu" || category === "graphics") return Number(product.specs?.tier) || 0;
  if (category === "memory") return -(Number(product.specs?.capacity) - Number(values.get("capacity")));
  if (category === "storage") return -((capacityGb(product) - Number(values.get("capacityGb"))) / 1000);
  if (category === "power") return -((Number(product.specs?.watts) || 0) - Number(values.get("watts")));
  if (category === "cooler") return -((Number(product.specs?.maxTdp) || 0) - Number(values.get("maxTdp")));
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
