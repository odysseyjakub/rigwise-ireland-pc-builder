import { checkCompatibility } from "./compatibility.js";
import { COMPONENTS } from "./data.js";
import { REFERENCE_BUILD_COMPONENTS, VERIFIED_CATALOGUE_PRODUCTS } from "./catalogue-data.js";

const categoryNames = new Map(COMPONENTS.map(component => [component.category, component.label]));
const $ = selector => document.querySelector(selector);

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[character]);
}

function renderChecks() {
  const result = checkCompatibility({
    components: REFERENCE_BUILD_COMPONENTS,
    products: VERIFIED_CATALOGUE_PRODUCTS,
    requirements: { requiresDedicatedGpu: true }
  });
  const labels = {
    compatible: "Documented checks pass",
    warning: "Review a warning",
    incompatible: "Incompatibility found",
    unknown: "Some checks need evidence"
  };
  $("#reference-status").textContent = labels[result.status];
  $("#reference-checks").replaceChildren(...result.checks.map(check => {
    const row = document.createElement("div");
    row.className = "reference-check";
    row.dataset.status = check.status;
    const dot = document.createElement("span");
    dot.className = "check-dot";
    dot.setAttribute("aria-hidden", "true");
    const title = document.createElement("strong");
    title.textContent = check.title;
    const detail = document.createElement("span");
    detail.textContent = check.detail;
    row.append(dot, title, detail);
    return row;
  }));
}

function renderProducts() {
  const query = $("#catalogue-search").value.trim().toLowerCase();
  const category = $("#catalogue-category").value;
  const products = VERIFIED_CATALOGUE_PRODUCTS.filter(product => {
    const content = [product.name, product.brand, product.manufacturerPartNumber, product.gtin, categoryNames.get(product.category)].filter(Boolean).join(" ").toLowerCase();
    return (!query || content.includes(query)) && (!category || product.category === category);
  });
  $("#catalogue-count").textContent = products.length + (products.length === 1 ? " MODEL" : " MODELS");
  if (products.length === 0) {
    const empty = document.createElement("p");
    empty.className = "catalogue-empty";
    empty.textContent = "No manufacturer reference matches. Try a shorter model name or another category.";
    $("#catalogue-products").replaceChildren(empty);
    return;
  }
  $("#catalogue-products").innerHTML = products.map(product => {
    const categoryLabel = categoryNames.get(product.category) || product.category;
    const partNumber = product.manufacturerPartNumber
      ? '<code>' + escapeHTML(product.manufacturerPartNumber) + '</code>'
      : '<span>Bundled item</span>';
    const gtin = product.gtin ? '<span> · GTIN ' + escapeHTML(product.gtin) + '</span>' : "";
    const specs = product.keySpecs.map(spec => "<li>" + escapeHTML(spec) + "</li>").join("");
    return '<article class="catalogue-card"><div class="catalogue-card-top"><span>' + escapeHTML(categoryLabel) + '</span><span>Source checked ' + escapeHTML(product.sourceCheckedAt) + '</span></div><h3>' + escapeHTML(product.name) + '</h3><span class="catalogue-card-brand">' + escapeHTML(product.brand) + '</span><div class="catalogue-part-number">Manufacturer part: ' + partNumber + gtin + '</div><ul class="catalogue-specs">' + specs + '</ul><div class="catalogue-card-bottom"><span class="catalogue-no-offer">No retailer offer connected</span><a class="catalogue-source" href="' + escapeHTML(product.sourceUrl) + '" target="_blank" rel="noopener noreferrer">Manufacturer source ↗</a></div></article>';
  }).join("");
}

function populateCategories() {
  const categories = [...new Set(VERIFIED_CATALOGUE_PRODUCTS.map(product => product.category))];
  $("#catalogue-category").append(...categories.map(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = categoryNames.get(category) || category;
    return option;
  }));
}

populateCategories();
const themeToggle = $("#component-theme-toggle");
try {
  if (window.localStorage.getItem("rigwise-theme") === "dark") document.body.classList.add("dark-theme");
} catch {}
themeToggle.setAttribute("aria-label", document.body.classList.contains("dark-theme") ? "Switch to light theme" : "Switch to dark theme");
themeToggle.addEventListener("click", () => {
  const dark = document.body.classList.toggle("dark-theme");
  themeToggle.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
  try {
    window.localStorage.setItem("rigwise-theme", dark ? "dark" : "light");
  } catch {}
});
renderChecks();
renderProducts();
$("#catalogue-search").addEventListener("input", renderProducts);
$("#catalogue-category").addEventListener("change", renderProducts);
