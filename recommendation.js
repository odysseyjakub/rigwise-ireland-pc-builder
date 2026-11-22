import { estimateAccessories } from "./accessories.js";
import { createQuizBuilderQuery, readQuizPreferences } from "./build-quiz-state.js";
import { BUNDLES, COMPONENTS, OFFERS, PRODUCTS, SHIPPING_RULES } from "./data.js";
import { generateAutoBuild } from "./auto-build.js";
import { fetchBuildFps, FPS_GAMES } from "./fps-estimates.js";
import { renderFpsPowerReference, renderFpsTable } from "./fps-ui.js";

const preferences = readQuizPreferences(location.search);
const intro = document.querySelector("#recommendation-intro");
const summary = document.querySelector("#recommendation-summary");
const fpsDetails = document.querySelector("#recommendation-fps");
const fpsStatus = document.querySelector("#recommendation-fps-status");
const fpsResults = document.querySelector("#recommendation-fps-results");
const fpsRetry = document.querySelector("#recommendation-fps-retry");
const money = value => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const workloadNames = {
  gaming: "Gaming & esports",
  streaming: "Gaming, streaming & multitasking",
  creative: "Video, photo & design",
  "3d": "3D, CAD & development",
  everyday: "Work, study & everyday"
};
let fpsRequestSequence = 0;
let fpsContext = null;

function showInvalidAnswers() {
  document.querySelector("#recommendation-title").textContent = "Let’s shape your build first.";
  intro.textContent = "Your answers are missing or out of date. Complete the short build questions to get a recommendation.";
  summary.replaceChildren();
  fpsDetails.hidden = true;
  document.querySelector("#recommendation-adjust").textContent = "Start questionnaire";
  document.querySelector("#recommendation-choose").hidden = true;
  document.querySelector(".quiz-review-note").hidden = true;
}

async function loadFps() {
  const requestId = ++fpsRequestSequence;
  if (!fpsContext?.build || !["gaming", "streaming"].includes(preferences.workload)) {
    fpsDetails.hidden = true;
    return;
  }
  fpsDetails.hidden = false;
  const cpu = PRODUCTS.find(product => product.id === fpsContext.build.cpu);
  const gpu = PRODUCTS.find(product => product.id === fpsContext.build.graphics);
  renderFpsPowerReference(document.querySelector("#recommendation-fps-power"), gpu);
  fpsResults.replaceChildren();
  fpsRetry.hidden = true;
  if (!cpu?.fpsCpuSlug || !gpu?.fpsGpuSlug) {
    fpsStatus.textContent = "FPSHQ does not have a match for these processor and graphics-card models yet.";
    return;
  }
  const gameSlugs = preferences.gameSlugs.length ? preferences.gameSlugs : FPS_GAMES.map(game => game.slug);
  fpsStatus.textContent = "Loading FPS estimates for your selected games…";
  try {
    const rows = await fetchBuildFps({ cpu, gpu, gameSlugs });
    if (requestId !== fpsRequestSequence) return;
    renderFpsTable(fpsResults, rows);
    const availableCount = rows.flatMap(game => game.resolutions).filter(result => result.status === "available").length;
    fpsStatus.textContent = availableCount === rows.length * 3
      ? "FPS reference for " + cpu.name + " + " + gpu.name + "."
      : availableCount
        ? "Some combinations are unavailable; the selected-game average uses available estimates only."
        : "No FPS results are available for this hardware combination right now.";
    fpsRetry.hidden = availableCount === rows.length * 3;
  } catch {
    if (requestId !== fpsRequestSequence) return;
    fpsStatus.textContent = "FPS data could not be loaded. Check your connection and try again.";
    fpsRetry.hidden = false;
  }
}

function renderRecommendation() {
  if (!preferences) {
    showInvalidAnswers();
    return;
  }
  const query = createQuizBuilderQuery(preferences);
  document.querySelector("#recommendation-adjust").href = "build-quiz.html?" + query;
  document.querySelector("#recommendation-choose").href = "builder.html?" + query;
  let result;
  try {
    result = generateAutoBuild({
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
  } catch {
    document.querySelector("#recommendation-title").textContent = "No sample recommendation available.";
    intro.textContent = "There isn’t a compatible sample set for these answers yet. Adjust the brief or choose parts manually.";
    return;
  }
  const ready = result.status === "ready";
  const build = ready ? result.build : result.closestCompatibleBuild || result.minimumCompatibleBuild;
  const total = ready ? result.plan.total : result.closestCompatibleTotal ?? result.minimumCompatibleTotal;
  const ids = ["cpu", "graphics", "memory", "storage"];
  const parts = build ? ids.map(id => {
    const component = COMPONENTS.find(item => item.id === id);
    const product = PRODUCTS.find(item => item.id === build[id]);
    return '<li><span>' + escapeHTML(component?.label || id) + '</span><strong>' + escapeHTML(product?.name || "Sample part") + "</strong></li>";
  }).join("") : '<li><span>Parts</span><strong>No compatible sample set found</strong></li>';
  const smoothness = preferences.targetFrameRate === 60 ? "standard" : preferences.targetFrameRate === 120 ? "smooth" : "very smooth";
  intro.textContent = ready
    ? workloadNames[preferences.workload] + " · " + (["gaming", "streaming"].includes(preferences.workload) ? preferences.targetResolution + " · " + smoothness : preferences.storagePreference.toUpperCase())
    : "No complete sample build fits every target yet. Here is the closest compatible set we can show.";
  const totalLabel = ready ? "Example PC total" : "Closest sample total";
  summary.innerHTML = build
    ? '<div class="quiz-review-total"><span>' + totalLabel + '</span><strong>' + money(total || 0) + '</strong><small>' + money(preferences.budget) + ' PC budget · accessories priced separately</small></div><ul class="quiz-review-parts">' + parts + '</ul>'
    : '<p class="quiz-review-no-fit">The sample catalogue has no compatible combination for these answers. Adjust your targets or choose parts manually.</p>';
  if (preferences.accessories.length) {
    summary.insertAdjacentHTML("beforeend", '<p class="quiz-review-accessories">Accessories: ' + money(estimateAccessories(preferences.accessories, preferences.targetResolution)) + ' example · separate from PC</p>');
  }
  fpsContext = { build };
  void loadFps();
}

fpsRetry.addEventListener("click", () => void loadFps());
renderRecommendation();

