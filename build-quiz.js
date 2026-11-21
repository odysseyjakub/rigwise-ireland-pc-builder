import { generateAutoBuild } from "./auto-build.js";
import { estimateAccessories } from "./accessories.js";
import { createQuizBuilderQuery, isValidStoragePreference, MAX_PC_BUDGET, readQuizPreferences, storageGigabytes } from "./build-quiz-state.js";
import { BUNDLES, COMPONENTS, OFFERS, PRODUCTS, SHIPPING_RULES } from "./data.js";

const form = document.querySelector("#build-quiz");
const steps = [...form.querySelectorAll("[data-quiz-step]")];
const budgetInput = document.querySelector("#quiz-budget");
const budgetOutput = document.querySelector("#quiz-budget-output");
const storageInput = document.querySelector("#quiz-storage");
const storageOutput = document.querySelector("#quiz-storage-output");
const progress = document.querySelector("#quiz-progress");
const progressFill = document.querySelector("#quiz-progress-fill");
const nextButton = document.querySelector("#quiz-next");
const submitButton = document.querySelector("#quiz-submit");
const backButton = document.querySelector("#quiz-back");
const review = document.querySelector("#quiz-review");
const goalCache = new Map();
let stepIndex = 0;
let storageTouched = false;
let budgetTouched = false;
let reviewQuery = "";

const money = value => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
const selected = name => form.querySelector('[name="' + name + '"]:checked')?.value || "";
const selectedValues = name => [...form.querySelectorAll('[name="' + name + '"]:checked')].map(input => input.value);
const gamingWorkloads = new Set(["gaming", "streaming"]);
const gamingGames = ["cyberpunk-2077", "fortnite", "cs2", "gta-v", "helldivers-2"];
const workloadNames = {
  gaming: "Gaming & esports",
  streaming: "Gaming, streaming & multitasking",
  creative: "Video, photo & design",
  "3d": "3D, CAD & development",
  everyday: "Work, study & everyday"
};

function currentWorkload() {
  return selected("workload");
}

function storagePreference(fallback = false) {
  const amount = Number(storageInput.value);
  const preference = Number.isInteger(amount) ? amount + "gb" : "";
  return isValidStoragePreference(preference) ? preference : fallback ? "1tb" : "";
}

function activeSteps() {
  return steps.filter(step => {
    if (step.dataset.quizStep === "performance") return gamingWorkloads.has(currentWorkload());
    if (step.dataset.quizStep === "creative-apps") return ["creative", "3d"].includes(currentWorkload());
    return true;
  });
}

function currentValues() {
  return {
    budget: Number(budgetInput.value),
    workload: currentWorkload() || "gaming",
    sizePreference: selected("size") || "any",
    storagePreference: storagePreference(true)
  };
}

function stepIsValid(step) {
  switch (step.dataset.quizStep) {
    case "needs":
      return budgetTouched && Boolean(currentWorkload());
    case "performance":
      return selectedValues("games").length > 0 && Boolean(form.querySelector("#quiz-resolution").value && form.querySelector("#quiz-fps").value);
    case "creative-apps":
      return selectedValues("apps").length > 0;
    case "fit":
      return Boolean(selected("design") && selected("size") && storageTouched && isValidStoragePreference(storagePreference()));
    case "strategy":
      return form.querySelector("#peripherals-none").checked || form.querySelectorAll('[name="peripherals"]:checked').length > 0;
    default:
      return false;
  }
}

function updateBudget() {
  budgetOutput.textContent = money(Number(budgetInput.value));
  budgetTouched = true;
  syncNavigation();
}

function updateStorageOutput() {
  const value = Number(storageInput.value);
  const valid = isValidStoragePreference(Number.isInteger(value) ? value + "gb" : "");
  storageOutput.textContent = valid
    ? new Intl.NumberFormat("en-IE").format(value) + " GB · the sample drive will meet or exceed this"
    : "Enter 256–8,000 GB, or choose a common size.";
  for (const button of document.querySelectorAll("[data-storage-gb]")) {
    button.setAttribute("aria-pressed", String(Number(button.dataset.storageGb) === value));
  }
  goalCache.clear();
  syncNavigation();
}

function syncNavigation() {
  const visible = activeSteps();
  stepIndex = Math.min(stepIndex, visible.length - 1);
  const current = visible[stepIndex];
  const valid = stepIsValid(current);
  nextButton.disabled = !valid;
  submitButton.disabled = !visible.every(stepIsValid);
  const step = current.dataset.quizStep;
  const hints = {
    needs: !budgetTouched ? "Move the budget slider to set your limit." : "Choose the PC’s main job.",
    performance: selectedValues("games").length ? "Choose resolution and smoothness." : "Pick at least one game, then set your screen targets.",
    "creative-apps": "Choose at least one kind of software.",
    fit: !selected("design") ? "Choose what matters more: appearance or performance." : !selected("size") ? "Choose a case size." : "Enter a storage amount or pick a common size.",
    strategy: "Choose accessories, or confirm you have what you need."
  };
  document.querySelector("#quiz-step-hint").textContent = valid
    ? step === "strategy" ? "Your build brief is ready." : "Your next choice is tailored to this build."
    : hints[step] || "Choose an option to continue.";
}

function renderStep(focus = false) {
  const visible = activeSteps();
  stepIndex = Math.min(stepIndex, visible.length - 1);
  const current = visible[stepIndex];
  for (const step of steps) step.hidden = step !== current;
  const percentage = Math.round(((stepIndex + 1) / visible.length) * 100);
  progress.textContent = "Step " + (stepIndex + 1) + " of " + visible.length;
  progressFill.style.width = percentage + "%";
  document.querySelector(".quiz-progress-track").setAttribute("aria-valuenow", String(percentage));
  backButton.hidden = stepIndex === 0;
  nextButton.hidden = stepIndex === visible.length - 1;
  submitButton.hidden = stepIndex !== visible.length - 1;
  document.querySelector("#quiz-error").hidden = true;
  syncNavigation();
  if (focus) current.querySelector("legend")?.focus();
  if (current.dataset.quizStep === "performance") {
    void updateGoalOptions("resolution");
    void updateGoalOptions("fps");
  }
  updateAccessoryTotal();
}

function minimumGoalBudget({ resolution, frameRate, sizePreference, storagePreference: storage }) {
  const key = [resolution, frameRate, sizePreference, storage].join(":");
  if (goalCache.has(key)) return goalCache.get(key);
  const result = generateAutoBuild({
    budget: MAX_PC_BUDGET,
    workload: "gaming",
    targetResolution: resolution,
    targetFrameRate: frameRate,
    sizePreference,
    storagePreference: storage,
    components: COMPONENTS,
    products: PRODUCTS,
    offers: OFFERS,
    bundles: BUNDLES,
    shippingRules: SHIPPING_RULES
  });
  const minimum = result.minimumGoalTotal === null ? null : Math.ceil(result.minimumGoalTotal / 50) * 50;
  goalCache.set(key, minimum);
  return minimum;
}

async function updateGoalOptions(kind) {
  const { budget, sizePreference, storagePreference: storage } = currentValues();
  const select = document.querySelector(kind === "resolution" ? "#quiz-resolution" : "#quiz-fps");
  const note = document.querySelector(kind === "resolution" ? "#quiz-resolution-note" : "#quiz-fps-note");
  const chosenResolution = form.querySelector("#quiz-resolution").value || "1080p";
  const options = [...select.querySelectorAll("option")].filter(option => option.value);
  select.disabled = true;
  note.textContent = "Checking the sample parts and your budget…";
  for (const option of options) {
    const minimum = minimumGoalBudget({
      resolution: kind === "resolution" ? option.value : chosenResolution,
      frameRate: kind === "resolution" ? 60 : Number(option.value),
      sizePreference,
      storagePreference: storage
    });
    option.dataset.minimumBudget = minimum === null ? "" : String(minimum);
    const label = kind === "resolution"
      ? option.value === "4k" ? "4K · most demanding" : option.value === "1440p" ? "1440p · sharper" : "1080p · balanced"
      : option.value === "60" ? "Standard" : option.value === "120" ? "Smooth" : "Very smooth";
    if (minimum === null) {
      option.textContent = label + " · unavailable in sample parts";
      option.disabled = true;
    } else {
      option.textContent = label + " · sample parts from " + money(minimum);
      option.disabled = budget < minimum && (kind === "resolution" ? option.value !== "1080p" : option.value !== "60");
    }
  }
  if (select.selectedOptions[0]?.disabled) select.value = "";
  select.disabled = false;
  const enabled = options.filter(option => !option.disabled);
  note.textContent = enabled.length
    ? "These choices change with your budget and storage. They are guidance, not performance guarantees."
    : "No matching sample target is available. Change your budget or target.";
  syncNavigation();
}

function updateAccessoryTotal() {
  const accessories = selectedValues("peripherals");
  const resolution = form.querySelector("#quiz-resolution").value || "1080p";
  const total = estimateAccessories(accessories, resolution);
  document.querySelector("#quiz-accessory-total").textContent = "Accessories: " + money(total) + " example allowance, separate from the PC";
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function showRecommendation() {
  const values = new FormData(form);
  const preferences = {
    budget: Number(values.get("budget")),
    workload: values.get("workload"),
    targetResolution: values.get("resolution") || "1080p",
    targetFrameRate: Number(values.get("fps")) || 60,
    sizePreference: values.get("size"),
    storagePreference: storagePreference(),
    strategy: "lowest",
    designPreference: values.get("design"),
    gameSlugs: values.getAll("games"),
    creativeApps: values.getAll("apps"),
    accessories: values.getAll("peripherals")
  };
  reviewQuery = createQuizBuilderQuery(preferences);
  const result = generateAutoBuild({
    budget: preferences.budget,
    workload: preferences.workload,
    targetResolution: preferences.targetResolution,
    targetFrameRate: preferences.targetFrameRate,
    sizePreference: preferences.sizePreference,
    storagePreference: preferences.storagePreference,
    strategy: preferences.strategy,
    components: COMPONENTS,
    products: PRODUCTS,
    offers: OFFERS,
    bundles: BUNDLES,
    shippingRules: SHIPPING_RULES
  });
  const ready = result.status === "ready";
  const recommendedBuild = ready ? result.build : result.closestCompatibleBuild || result.minimumCompatibleBuild;
  const total = ready ? result.plan.total : result.closestCompatibleTotal ?? result.minimumCompatibleTotal;
  const partIds = ["cpu", "graphics", "memory", "storage"];
  const parts = recommendedBuild
    ? partIds.map(id => {
      const component = COMPONENTS.find(item => item.id === id);
      const product = PRODUCTS.find(item => item.id === recommendedBuild[id]);
      return '<li><span>' + escapeHTML(component?.label || id) + '</span><strong>' + escapeHTML(product?.name || "Sample part") + "</strong></li>";
    }).join("")
    : "<li><span>Parts</span><strong>No compatible sample set found</strong></li>";
  const designNote = preferences.designPreference === "aesthetics"
    ? "Style focus: case, cooling and lighting. Current samples don’t contain verified appearance or RGB data, so those options will be easier to assess in the parts step."
    : "Power focus: parts are balanced around your selected use, screen and budget.";
  document.querySelector("#quiz-review-intro").textContent = ready
    ? workloadNames[preferences.workload] + " · " + (gamingWorkloads.has(preferences.workload) ? preferences.targetResolution + " · " + (preferences.targetFrameRate === 60 ? "standard" : preferences.targetFrameRate === 120 ? "smooth" : "very smooth") : preferences.storagePreference.toUpperCase())
    : "No complete sample build fits every target yet. Here is the closest compatible set we can show.";
  document.querySelector("#quiz-review-summary").innerHTML = (recommendedBuild
    ? '<div class="quiz-review-total"><span>' + (ready ? "Example PC total" : "Closest sample total") + '</span><strong>' + money(total || 0) + '</strong><small>€' + preferences.budget.toLocaleString("en-IE") + " PC budget · accessories separate</small></div>" +
      '<ul class="quiz-review-parts">' + parts + '</ul>'
    : '<p class="quiz-review-no-fit">The sample catalogue has no compatible combination for these answers. You can still adjust your targets or continue to the parts builder.</p>') +
    '<p class="quiz-review-style">' + escapeHTML(designNote) + '</p>' +
    (preferences.accessories.length ? '<p class="quiz-review-accessories">Accessories: ' + money(estimateAccessories(preferences.accessories, preferences.targetResolution)) + ' example allowance · separate from PC</p>' : "");
  document.querySelector(".quiz-hero").hidden = true;
  form.hidden = true;
  review.hidden = false;
  review.querySelector("h2").focus();
}

budgetInput.addEventListener("input", () => {
  updateBudget();
  if (activeSteps()[stepIndex]?.dataset.quizStep === "performance") {
    void updateGoalOptions("resolution");
    void updateGoalOptions("fps");
  }
});

form.querySelectorAll('[name="workload"]').forEach(input => input.addEventListener("change", () => {
  const visible = activeSteps();
  stepIndex = Math.min(stepIndex, visible.length - 1);
  renderStep();
}));

form.querySelectorAll('[name="size"], [name="design"]').forEach(input => input.addEventListener("change", () => {
  goalCache.clear();
  syncNavigation();
}));

storageInput.addEventListener("input", () => {
  storageTouched = true;
  updateStorageOutput();
});
document.querySelectorAll("[data-storage-gb]").forEach(button => button.addEventListener("click", () => {
  storageInput.value = button.dataset.storageGb;
  storageTouched = true;
  updateStorageOutput();
}));

form.querySelectorAll('[name="peripherals"]').forEach(input => input.addEventListener("change", () => {
  if (input.checked) document.querySelector("#peripherals-none").checked = false;
  updateAccessoryTotal();
  syncNavigation();
}));
document.querySelector("#peripherals-none").addEventListener("change", event => {
  if (event.currentTarget.checked) form.querySelectorAll('[name="peripherals"]').forEach(input => { input.checked = false; });
  syncNavigation();
  updateAccessoryTotal();
});
form.querySelectorAll('[name="games"], [name="apps"]').forEach(input => input.addEventListener("change", syncNavigation));
document.querySelector("#quiz-resolution").addEventListener("change", () => {
  document.querySelector("#quiz-fps").value = "";
  void updateGoalOptions("fps");
  updateAccessoryTotal();
  syncNavigation();
});
document.querySelector("#quiz-fps").addEventListener("change", syncNavigation);

nextButton.addEventListener("click", () => {
  const current = activeSteps()[stepIndex];
  if (!stepIsValid(current)) {
    document.querySelector("#quiz-error").textContent = "Answer each question on this step before continuing.";
    document.querySelector("#quiz-error").hidden = false;
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
  const visible = activeSteps();
  if (!visible.every(stepIsValid)) {
    stepIndex = Math.max(0, visible.findIndex(step => !stepIsValid(step)));
    renderStep(true);
    document.querySelector("#quiz-error").textContent = "Complete every question, including choosing the accessories you need or confirming you have them.";
    document.querySelector("#quiz-error").hidden = false;
    return;
  }
  showRecommendation();
});

document.querySelector("#quiz-adjust").addEventListener("click", () => {
  review.hidden = true;
  form.hidden = false;
  document.querySelector(".quiz-hero").hidden = false;
  stepIndex = activeSteps().length - 1;
  renderStep(true);
});
document.querySelector("#quiz-continue").addEventListener("click", () => {
  window.location.href = "builder.html?" + reviewQuery;
});

const previousAnswers = readQuizPreferences(location.search);
if (previousAnswers) {
  budgetInput.value = String(previousAnswers.budget);
  form.querySelector('[name="workload"][value="' + previousAnswers.workload + '"]').checked = true;
  form.querySelector('[name="design"][value="' + previousAnswers.designPreference + '"]').checked = true;
  form.querySelector('[name="size"][value="' + previousAnswers.sizePreference + '"]').checked = true;
  storageInput.value = String(storageGigabytes(previousAnswers.storagePreference) || 1000);
  storageTouched = true;
  for (const slug of previousAnswers.gameSlugs) {
    const input = form.querySelector('[name="games"][value="' + slug + '"]');
    if (input) input.checked = true;
  }
  for (const app of previousAnswers.creativeApps) {
    const input = form.querySelector('[name="apps"][value="' + app + '"]');
    if (input) input.checked = true;
  }
  for (const accessory of previousAnswers.accessories) {
    const input = form.querySelector('[name="peripherals"][value="' + accessory + '"]');
    if (input) input.checked = true;
  }
  document.querySelector("#peripherals-none").checked = previousAnswers.accessories.length === 0;
  document.querySelector("#quiz-resolution").value = previousAnswers.targetResolution;
  document.querySelector("#quiz-fps").value = String(previousAnswers.targetFrameRate);
  budgetTouched = true;
}

updateBudget();
if (!previousAnswers) budgetTouched = false;
updateStorageOutput();
renderStep();

