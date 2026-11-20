import { generateAutoBuild } from "./auto-build.js";
import { estimateAccessories } from "./accessories.js";
import { createQuizBuilderQuery, MAX_PC_BUDGET } from "./build-quiz-state.js";
import { BUNDLES, COMPONENTS, OFFERS, PRODUCTS, SHIPPING_RULES } from "./data.js";

const form = document.querySelector("#build-quiz");
const steps = [...form.querySelectorAll("[data-quiz-step]")];
const budgetInput = document.querySelector("#quiz-budget");
const budgetOutput = document.querySelector("#quiz-budget-output");
const progress = document.querySelector("#quiz-progress");
const progressFill = document.querySelector("#quiz-progress-fill");
const nextButton = document.querySelector("#quiz-next");
const submitButton = document.querySelector("#quiz-submit");
const backButton = document.querySelector("#quiz-back");
const goalCache = new Map();
let stepIndex = 0;
let budgetTouched = false;

function currentWorkload() {
  return form.querySelector('[name="workload"]:checked')?.value ?? "";
}

function activeSteps() {
  const gaming = currentWorkload() === "gaming";
  return steps.filter(step => !["resolution", "frame-rate"].includes(step.dataset.quizStep) || gaming);
}

function currentValues() {
  return {
    budget: Number(budgetInput.value),
    sizePreference: form.querySelector('[name="size"]:checked')?.value,
    storagePreference: form.querySelector('[name="storage"]:checked')?.value
  };
}

function stepIsValid(step) {
  if (step.dataset.quizStep === "budget") return budgetTouched;
  if (step.dataset.quizStep === "peripherals") {
    return form.querySelector("#peripherals-none").checked || form.querySelectorAll('[name="peripherals"]:checked').length > 0;
  }
  return [...step.querySelectorAll("input[required],select[required]")].every(input => input.type === "radio"
    ? Boolean(form.querySelector('[name="' + input.name + '"]:checked'))
    : Boolean(input.value));
}

function updateBudget() {
  const value = Number(budgetInput.value);
  budgetOutput.textContent = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
  syncNavigation();
}

function syncNavigation() {
  const visible = activeSteps();
  stepIndex = Math.min(stepIndex, visible.length - 1);
  const current = visible[stepIndex];
  const valid = stepIsValid(current);
  nextButton.disabled = !valid;
  submitButton.disabled = !valid || !visible.every(stepIsValid);
  document.querySelector("#quiz-step-hint").textContent = valid
    ? stepIndex === visible.length - 1 ? "All answers are ready." : "Answer each question to continue."
    : current.dataset.quizStep === "budget" ? "Move the slider to set your budget."
      : current.dataset.quizStep === "peripherals" ? "Choose at least one accessory or select that you need none."
        : "Choose an answer to continue.";
}

function renderStep(focus = false) {
  const visible = activeSteps();
  stepIndex = Math.min(stepIndex, visible.length - 1);
  const current = visible[stepIndex];
  for (const step of steps) step.hidden = step !== current;
  const percentage = Math.round(((stepIndex + 1) / visible.length) * 100);
  progress.textContent = "Question " + (stepIndex + 1) + " of " + visible.length;
  progressFill.style.width = percentage + "%";
  document.querySelector(".quiz-progress-track").setAttribute("aria-valuenow", String(percentage));
  backButton.hidden = stepIndex === 0;
  nextButton.hidden = stepIndex === visible.length - 1;
  submitButton.hidden = stepIndex !== visible.length - 1;
  document.querySelector("#quiz-error").hidden = true;
  syncNavigation();
  if (focus) current.querySelector("legend")?.focus();
  if (current.dataset.quizStep === "resolution") void updateGoalOptions("resolution");
  if (current.dataset.quizStep === "frame-rate") void updateGoalOptions("frame-rate");
  updateAccessoryTotal();
}

function minimumGoalBudget({ resolution, frameRate, sizePreference, storagePreference }) {
  const key = [resolution, frameRate, sizePreference, storagePreference].join(":");
  if (goalCache.has(key)) return goalCache.get(key);
  const result = generateAutoBuild({
    budget: MAX_PC_BUDGET,
    workload: "gaming",
    targetResolution: resolution,
    targetFrameRate: frameRate,
    sizePreference,
    storagePreference,
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
  const { budget, sizePreference, storagePreference } = currentValues();
  const select = document.querySelector(kind === "resolution" ? "#quiz-resolution" : "#quiz-fps");
  const note = document.querySelector(kind === "resolution" ? "#quiz-resolution-note" : "#quiz-fps-note");
  const chosenResolution = form.querySelector('[name="resolution"]')?.value || "1080p";
  const options = [...select.querySelectorAll("option")].filter(option => option.value);
  select.disabled = true;
  note.textContent = "Checking the current sample parts…";
  for (const option of options) {
    const minimum = minimumGoalBudget({
      resolution: kind === "resolution" ? option.value : chosenResolution,
      frameRate: kind === "resolution" ? 60 : Number(option.value),
      sizePreference,
      storagePreference
    });
    option.dataset.minimumBudget = minimum === null ? "" : String(minimum);
    const label = kind === "resolution"
      ? option.value === "4k" ? "4K" : option.value
      : "Around " + option.value + " FPS";
    if (minimum === null) {
      option.textContent = label + " · unavailable with these sample parts";
      option.disabled = true;
    } else {
      option.textContent = label + " · sample parts from " + new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(minimum);
      option.disabled = budget < minimum && (kind === "resolution" ? option.value !== "1080p" : option.value !== "60");
    }
  }
  if (select.selectedOptions[0]?.disabled) select.value = "";
  select.disabled = false;
  const enabled = options.filter(option => !option.disabled);
  note.textContent = enabled.length
    ? "Options are limited by the sample parts and your budget. They are not FPS or benchmark promises."
    : "No matching target is available in the current sample parts. Change size, storage, or budget.";
  syncNavigation();
}

function updateAccessoryTotal() {
  const selected = [...form.querySelectorAll('[name="peripherals"]:checked')].map(input => input.value);
  const resolution = form.querySelector('[name="resolution"]')?.value || "1080p";
  const total = estimateAccessories(selected, resolution);
  document.querySelector("#quiz-accessory-total").textContent = "Sample accessory allowance: " + new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(total);
}

budgetInput.addEventListener("input", () => {
  budgetTouched = true;
  updateBudget();
});
budgetInput.addEventListener("change", () => {
  budgetTouched = true;
  updateBudget();
});

form.querySelectorAll('[name="workload"],[name="size"],[name="storage"],[name="strategy"]').forEach(input => {
  input.addEventListener("change", () => {
    syncNavigation();
    if (["size", "storage"].includes(input.name)) goalCache.clear();
    if (input.name === "workload") renderStep();
  });
});

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
document.querySelector("#quiz-resolution").addEventListener("change", () => {
  document.querySelector("#quiz-fps").value = "";
  syncNavigation();
  updateAccessoryTotal();
});
document.querySelector("#quiz-fps").addEventListener("change", syncNavigation);

nextButton.addEventListener("click", () => {
  const current = activeSteps()[stepIndex];
  if (!stepIsValid(current)) {
    document.querySelector("#quiz-error").textContent = "Please answer this question before continuing.";
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
    const firstInvalid = visible.findIndex(step => !stepIsValid(step));
    stepIndex = Math.max(0, firstInvalid);
    renderStep(true);
    document.querySelector("#quiz-error").textContent = "Please complete every question before building your PC.";
    document.querySelector("#quiz-error").hidden = false;
    return;
  }
  const values = new FormData(form);
  const query = createQuizBuilderQuery({
    budget: Number(values.get("budget")),
    workload: values.get("workload"),
    targetResolution: values.get("resolution") || "1080p",
    targetFrameRate: Number(values.get("fps")) || 60,
    sizePreference: values.get("size"),
    storagePreference: values.get("storage"),
    strategy: values.get("strategy"),
    accessories: values.getAll("peripherals")
  });
  window.location.href = "builder.html?" + query;
});

updateBudget();
renderStep();
