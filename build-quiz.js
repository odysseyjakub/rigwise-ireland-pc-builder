import { createQuizBuilderQuery } from "./build-quiz-state.js";

const form = document.querySelector("#build-quiz");
const steps = [...form.querySelectorAll("[data-quiz-step]")];
const workloadInputs = [...form.querySelectorAll('[name="workload"]')];
const progress = document.querySelector("#quiz-progress");
const progressFill = document.querySelector("#quiz-progress-fill");
const budgetInput = document.querySelector("#quiz-budget");
const budgetOutput = document.querySelector("#quiz-budget-output");
let stepIndex = 0;

function activeSteps() {
  const gaming = form.querySelector('[name="workload"]:checked')?.value === "gaming";
  return steps.filter(step => step.dataset.quizStep !== "gaming" || gaming);
}

function renderStep(focus = false) {
  const visibleSteps = activeSteps();
  stepIndex = Math.min(stepIndex, visibleSteps.length - 1);
  const current = visibleSteps[stepIndex];
  for (const step of steps) step.hidden = !visibleSteps.includes(step) || step !== current;
  const percentage = Math.round(((stepIndex + 1) / visibleSteps.length) * 100);
  progress.textContent = "Question " + (stepIndex + 1) + " of " + visibleSteps.length;
  progressFill.style.width = percentage + "%";
  document.querySelector(".quiz-progress-track").setAttribute("aria-valuenow", String(percentage));
  document.querySelector("#quiz-back").hidden = stepIndex === 0;
  document.querySelector("#quiz-next").hidden = stepIndex === visibleSteps.length - 1;
  document.querySelector("#quiz-submit").hidden = stepIndex !== visibleSteps.length - 1;
  if (focus) current.querySelector("legend")?.focus();
}

function updateBudget() {
  const value = Number(budgetInput.value);
  budgetOutput.textContent = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

budgetInput.addEventListener("input", updateBudget);
workloadInputs.forEach(input => input.addEventListener("change", () => {
  const visibleSteps = activeSteps();
  const currentId = steps[stepIndex]?.dataset.quizStep;
  const nextIndex = visibleSteps.findIndex(step => step.dataset.quizStep === currentId);
  if (nextIndex === -1) stepIndex = visibleSteps.findIndex(step => step.dataset.quizStep === "size");
  else stepIndex = nextIndex;
  renderStep();
}));

document.querySelector("#quiz-next").addEventListener("click", () => {
  stepIndex = Math.min(stepIndex + 1, activeSteps().length - 1);
  renderStep(true);
});
document.querySelector("#quiz-back").addEventListener("click", () => {
  stepIndex = Math.max(0, stepIndex - 1);
  renderStep(true);
});

form.addEventListener("submit", event => {
  event.preventDefault();
  const values = new FormData(form);
  const query = createQuizBuilderQuery({
    budget: Number(values.get("budget")),
    workload: values.get("workload"),
    targetResolution: values.get("resolution"),
    targetFrameRate: Number(values.get("fps")),
    sizePreference: values.get("size")
  });
  window.location.href = "builder.html?" + query;
});

updateBudget();
renderStep();

