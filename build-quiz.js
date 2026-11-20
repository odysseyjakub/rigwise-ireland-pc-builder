import { generateAutoBuild } from "./auto-build.js";
import { estimateAccessories } from "./accessories.js";
import { createQuizBuilderQuery, isValidStoragePreference, MAX_PC_BUDGET } from "./build-quiz-state.js";
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
const goalCache = new Map();
let stepIndex = 0;
let storageTouched = false;

const money = value => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
const selected = name => form.querySelector('[name="' + name + '"]:checked')?.value || "";

function currentWorkload() {
  return selected("workload");
}

function storagePreference(fallback = false) {
  const amount = Number(storageInput.value);
  const preference = Number.isInteger(amount) ? amount + "gb" : "";
  return isValidStoragePreference(preference) ? preference : fallback ? "1tb" : "";
}

function activeSteps() {
  return steps.filter(step => step.dataset.quizStep !== "performance" || currentWorkload() === "gaming");
}

function currentValues() {
  return {
    budget: Number(budgetInput.value),
    sizePreference: selected("size") || "any",
    storagePreference: storagePreference(true)
  };
}

function stepIsValid(step) {
  switch (step.dataset.quizStep) {
    case "needs":
      return Boolean(currentWorkload());
    case "performance":
      return currentWorkload() !== "gaming" || Boolean(form.querySelector("#quiz-resolution").value && form.querySelector("#quiz-fps").value);
    case "fit":
      return Boolean(selected("size")) && storageTouched && isValidStoragePreference(storagePreference());
    case "strategy":
      return form.querySelector("#peripherals-none").checked || form.querySelectorAll('[name="peripherals"]:checked').length > 0;
    default:
      return true;
  }
}

function updateBudget() {
  budgetOutput.textContent = money(Number(budgetInput.value));
  syncNavigation();
}

function updateStorageOutput() {
  const value = Number(storageInput.value);
  const valid = isValidStoragePreference(Number.isInteger(value) ? value + "gb" : "");
  storageOutput.textContent = valid
    ? new Intl.NumberFormat("en-IE").format(value) + " GB target · the sample drive will meet or exceed this"
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
    needs: !currentWorkload() ? "Choose what you’ll use the PC for." : "Your tower budget is separate from accessories.",
    performance: "Choose both targets, or go back to adjust your budget.",
    fit: !selected("size") ? "Choose a case size that suits your space." : "Enter a storage amount or pick a common size.",
    strategy: "Choose accessories, or confirm you need none."
  };
  document.querySelector("#quiz-step-hint").textContent = valid
    ? step === "strategy" ? "Your build brief is ready." : "You can fine-tune every part after this."
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
      : "Around " + option.value + " FPS";
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
    ? "Targets change with your budget and storage choice. They are not FPS guarantees."
    : "No matching target is available in the sample parts. Change your budget or targets.";
  syncNavigation();
}

function updateAccessoryTotal() {
  const accessories = [...form.querySelectorAll('[name="peripherals"]:checked')].map(input => input.value);
  const resolution = form.querySelector("#quiz-resolution").value || "1080p";
  const total = estimateAccessories(accessories, resolution);
  document.querySelector("#quiz-accessory-total").textContent = "Illustrative accessory allowance: " + new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(total);
}

budgetInput.addEventListener("input", () => {
  updateBudget();
  if (activeSteps()[stepIndex]?.dataset.quizStep === "performance") {
    void updateGoalOptions("resolution");
    void updateGoalOptions("fps");
  }
});

form.querySelectorAll('[name="workload"]').forEach(input => input.addEventListener("change", () => {
  renderStep();
}));

form.querySelectorAll('[name="size"]').forEach(input => input.addEventListener("change", () => {
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
    document.querySelector("#quiz-error").textContent = "Finish the choices on this step to continue.";
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
    document.querySelector("#quiz-error").textContent = "Complete each short step, including choosing no accessories if you need none.";
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
    storagePreference: storagePreference(),
    strategy: values.get("strategy") || "lowest",
    accessories: values.getAll("peripherals")
  });
  window.location.href = "builder.html?" + query;
});

updateBudget();
updateStorageOutput();
renderStep();

