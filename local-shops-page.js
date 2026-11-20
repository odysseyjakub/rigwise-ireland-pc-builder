import { COUNTIES } from "./data.js";
import { readStorageValue, writeStorageValue } from "./browser-storage.js";
import { buildShopMapPreviewUrl } from "./shop-map.js";

const $ = selector => document.querySelector(selector);
const countySelect = $("#county");
const searchButton = $("#find-local-shops");
const status = $("#local-shops-status");
const resultsList = $("#local-shop-results");
const mapPanel = $("#local-shop-map");
const mapFrame = $("#local-shop-map-frame");
let requestController = null;
let requestSequence = 0;

for (const county of COUNTIES) {
  const option = document.createElement("option");
  option.value = county;
  option.textContent = county;
  countySelect.append(option);
}
countySelect.value = COUNTIES.includes(readStorageValue("rigwise-county")) ? readStorageValue("rigwise-county") : "Dublin";

function closeMap() {
  mapPanel.hidden = true;
  mapFrame.src = "about:blank";
}

function makeLink(label, href) {
  const link = document.createElement("a");
  link.href = href;
  link.textContent = label;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

function renderShop(shop) {
  const item = document.createElement("li");
  item.className = "local-shop-item";
  const detail = document.createElement("div");
  detail.className = "local-shop-detail";
  const name = document.createElement("strong");
  name.textContent = shop.name;
  const description = document.createElement("span");
  description.textContent = shop.kind + (shop.address ? " · " + shop.address : " · Address not listed");
  detail.append(name, description);

  const actions = document.createElement("div");
  actions.className = "local-shop-actions";
  if (shop.website) actions.append(makeLink("Website", shop.website));
  actions.append(makeLink("OSM listing", shop.mapUrl));
  if (shop.coordinates) {
    const preview = document.createElement("button");
    preview.type = "button";
    preview.dataset.shopMap = "";
    preview.dataset.lat = String(shop.coordinates.lat);
    preview.dataset.lon = String(shop.coordinates.lon);
    preview.setAttribute("aria-label", "Show map preview for " + shop.name);
    preview.textContent = "Map preview";
    actions.append(preview);
  }
  item.append(detail, actions);
  return item;
}

countySelect.addEventListener("change", () => {
  writeStorageValue("rigwise-county", countySelect.value);
  requestSequence++;
  requestController?.abort();
  requestController = null;
  searchButton.disabled = false;
  resultsList.replaceChildren();
  closeMap();
  status.textContent = "County updated. Search when you’re ready; no lookup happens automatically.";
});

searchButton.addEventListener("click", async () => {
  const county = countySelect.value;
  if (!COUNTIES.includes(county)) return;
  writeStorageValue("rigwise-county", county);
  requestController?.abort();
  requestController = new AbortController();
  const controller = requestController;
  const sequence = ++requestSequence;
  searchButton.disabled = true;
  resultsList.replaceChildren();
  closeMap();
  status.textContent = "Looking for computer and electronics shops tagged in " + county + "…";
  try {
    const response = await fetch("/api/shops?county=" + encodeURIComponent(county), { signal: controller.signal, headers: { Accept: "application/json" } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "The public shop directory could not be loaded.");
    if (sequence !== requestSequence) return;
    if (!Array.isArray(payload.results) || payload.results.length === 0) {
      status.textContent = "No computer or electronics shop entries were found for " + county + ". You can still check the public map directly.";
      return;
    }
    for (const shop of payload.results) resultsList.append(renderShop(shop));
    const freshness = payload.dataTimestamp ? " · map data snapshot " + payload.dataTimestamp : "";
    const capped = payload.capped ? " · showing up to 80 mapped entries" : "";
    status.textContent = payload.results.length + (payload.results.length === 1 ? " mapped entry" : " mapped entries") + " in " + county + " · OpenStreetMap contributors" + freshness + capped;
  } catch (error) {
    if (controller.signal.aborted || sequence !== requestSequence) return;
    status.textContent = error instanceof Error ? error.message : "The public shop directory could not be loaded. Try again later.";
  } finally {
    if (sequence === requestSequence) searchButton.disabled = false;
  }
});

resultsList.addEventListener("click", event => {
  const button = event.target.closest("[data-shop-map]");
  if (!button) return;
  const src = buildShopMapPreviewUrl({ lat: Number(button.dataset.lat), lon: Number(button.dataset.lon) });
  if (!src) return;
  mapFrame.title = button.getAttribute("aria-label").replace(/^Show map preview for /, "OpenStreetMap preview for ");
  mapFrame.src = src;
  mapPanel.hidden = false;
  mapPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

$("#local-shop-map-close").addEventListener("click", closeMap);
