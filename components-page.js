import { checkCompatibility } from "./compatibility.js";
import { compareManufacturerProducts } from "./comparison.js";
import { COMPONENTS } from "./data.js";
import { REFERENCE_BUILD, VERIFIED_CATALOGUE_PRODUCTS } from "./catalogue-data.js";

const categoryNames = new Map(COMPONENTS.map(component => [component.category, component.label]));
const $ = selector => document.querySelector(selector);

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[character]);
}

function renderChecks() {
  const result = checkCompatibility({
    components: COMPONENTS.map(component => ({
      ...component,
      productId: $("#reference-build-" + component.id).value
    })),
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

function populateReferenceBuildControls() {
  const controls = $("#reference-build-controls");
  controls.replaceChildren(...COMPONENTS.map(component => {
    const label = document.createElement("label");
    label.htmlFor = "reference-build-" + component.id;
    label.textContent = component.label;
    const select = document.createElement("select");
    select.id = "reference-build-" + component.id;
    select.setAttribute("aria-label", "Select " + component.label);
    const products = VERIFIED_CATALOGUE_PRODUCTS.filter(product => product.category === component.category);
    select.append(...products.map(product => {
      const option = document.createElement("option");
      option.value = product.id;
      option.textContent = product.brand + " · " + product.name;
      return option;
    }));
    if (products.some(product => product.id === REFERENCE_BUILD[component.id])) {
      select.value = REFERENCE_BUILD[component.id];
    }
    select.addEventListener("change", renderChecks);
    label.append(select);
    return label;
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
    const manufacturerIdentifier = product.manufacturerPartNumber
      ? 'Part number: <code>' + escapeHTML(product.manufacturerPartNumber) + '</code>'
      : product.manufacturerModel
        ? 'Model: <code>' + escapeHTML(product.manufacturerModel) + '</code>'
        : 'Bundled item';
    const identifierLabel = escapeHTML(product.gtinFormat || "GTIN");
    const gtin = product.gtin ? '<span> · ' + identifierLabel + ' ' + escapeHTML(product.gtin) + '</span>' : "";
    const specs = product.keySpecs.map(spec => "<li>" + escapeHTML(spec) + "</li>").join("");
    const offerLabel = product.includedWithProductId ? "Included with boxed CPU · no separate offer" : "No retailer offer connected";
    return '<article class="catalogue-card"><div class="catalogue-card-top"><span>' + escapeHTML(categoryLabel) + '</span><span>Source checked ' + escapeHTML(product.sourceCheckedAt) + '</span></div><h3>' + escapeHTML(product.name) + '</h3><span class="catalogue-card-brand">' + escapeHTML(product.brand) + '</span><div class="catalogue-part-number">Manufacturer identifier: ' + manufacturerIdentifier + gtin + '</div><ul class="catalogue-specs">' + specs + '</ul><div class="catalogue-card-bottom"><span class="catalogue-no-offer">' + escapeHTML(offerLabel) + '</span><a class="catalogue-source" href="' + escapeHTML(product.sourceUrl) + '" target="_blank" rel="noopener noreferrer">Manufacturer source ↗</a></div></article>';
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

function populateManufacturerComparison() {
  const categorySelect = $("#catalogue-compare-category");
  const comparableCategories = [...new Set(VERIFIED_CATALOGUE_PRODUCTS.map(product => product.category))]
    .filter(category => VERIFIED_CATALOGUE_PRODUCTS.filter(product => product.category === category).length >= 2);
  categorySelect.append(...comparableCategories.map(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = categoryNames.get(category) || category;
    return option;
  }));

  const modelSelects = [$("#catalogue-compare-model-a"), $("#catalogue-compare-model-b"), $("#catalogue-compare-model-c")];
  const submit = $("#catalogue-compare-button");
  const status = $("#catalogue-compare-status");
  const results = $("#catalogue-compare-results");

  function fillModels() {
    const category = categorySelect.value;
    const products = VERIFIED_CATALOGUE_PRODUCTS.filter(product => product.category === category);
    modelSelects.forEach((select, index) => {
      const emptyOption = document.createElement("option");
      emptyOption.value = "";
      emptyOption.textContent = index === 2 ? "No third model" : "Choose a model";
      select.replaceChildren(emptyOption, ...products.map(product => {
        const option = document.createElement("option");
        option.value = product.id;
        option.textContent = product.brand + " · " + product.name;
        return option;
      }));
      if (index < 2 && products[index]) select.value = products[index].id;
    });
    submit.disabled = products.length < 2;
    results.replaceChildren();
    status.textContent = products.length < 2
      ? "At least two documented models are needed in one category."
      : "Choose two or three models. This comparison contains manufacturer specifications only; it has no retailer prices or offers.";
  }

  function formatSpec(key, value) {
    if (value === undefined || value === null) return "Not recorded in this catalogue";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (key === "pcieGeneration" && typeof value === "number") return "PCIe Gen " + value;
    if (Array.isArray(value)) {
      if (value.every(item => item && typeof item === "object" && !Array.isArray(item))) {
        return value.map(item => {
          const parts = [];
          if (Array.isArray(item.formFactors)) parts.push(item.formFactors.join(" / "));
          if (Array.isArray(item.interfaces)) parts.push(item.interfaces.join(" / "));
          if (Array.isArray(item.pcieGenerations)) parts.push("PCIe Gen " + item.pcieGenerations.join(" / "));
          return parts.join(" · ") || "Detailed slot data";
        }).join("; ");
      }
      return value.length ? value.join(", ") : "None listed";
    }
    if (typeof value !== "number") return String(value);
    const units = {
      watts: " W", recommendedSystemPowerW: " W", length: " mm", lengthMm: " mm",
      heightMm: " mm", maxCoolerHeightMm: " mm", maxGpuLength: " mm", maxPsuLengthMm: " mm",
      maxMemoryGb: " GB", memoryGb: " GB", capacityGb: " GB", speedMts: " MT/s",
      profileSpeedMts: " MT/s", maxMemorySpeedMts: " MT/s", maxMemoryOcSpeedMts: " MT/s",
      baseClockGHz: " GHz", maxBoostClockGHz: " GHz", coreCount: " cores", threadCount: " threads",
      memorySlots: " slots", maxGpuSlots: " slots", capacity: " TB"
    };
    return String(value) + (units[key] ?? "");
  }

  function renderComparison() {
    const category = categorySelect.value;
    const productIds = modelSelects.map(select => select.value).filter(Boolean);
    try {
      const comparison = compareManufacturerProducts({
        category,
        productIds,
        products: VERIFIED_CATALOGUE_PRODUCTS
      });
      const table = document.createElement("table");
      table.className = "manufacturer-comparison-table";
      const caption = document.createElement("caption");
      caption.className = "visually-hidden";
      caption.textContent = comparison.categoryLabel + " manufacturer specifications";
      table.append(caption);

      const head = document.createElement("thead");
      const headingRow = document.createElement("tr");
      const specHeading = document.createElement("th");
      specHeading.scope = "col";
      specHeading.textContent = "Specification";
      headingRow.append(specHeading);
      comparison.columns.forEach(({ product }) => {
        const heading = document.createElement("th");
        heading.scope = "col";
        const source = document.createElement("a");
        source.href = product.sourceUrl;
        source.target = "_blank";
        source.rel = "noopener noreferrer";
        source.textContent = product.brand + " · " + product.name;
        heading.append(source);
        headingRow.append(heading);
      });
      head.append(headingRow);
      table.append(head);

      const body = document.createElement("tbody");
      comparison.specKeys.forEach(key => {
        const row = document.createElement("tr");
        const label = document.createElement("th");
        label.scope = "row";
        label.textContent = key.replace(/([A-Z])/g, " $1").replace(/^./, first => first.toUpperCase()).replace(/M2/g, "M.2");
        row.append(label);
        comparison.columns.forEach(column => {
          const cell = document.createElement("td");
          cell.textContent = formatSpec(key, column.specs[key]);
          row.append(cell);
        });
        body.append(row);
      });
      table.append(body);
      results.replaceChildren(table);
      status.textContent = "Compared " + comparison.columns.length + " " + comparison.categoryLabel.toLowerCase() + " models. Missing entries mean the fact is not recorded here.";
    } catch (error) {
      results.replaceChildren();
      status.textContent = error.message;
    }
  }

  categorySelect.addEventListener("change", fillModels);
  submit.addEventListener("click", renderComparison);
  fillModels();
}

populateCategories();
populateReferenceBuildControls();
populateManufacturerComparison();
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
