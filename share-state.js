import { normalizeAccessories } from "./accessories.js";
import { isValidStoragePreference, normalizeCreativeApps, normalizeGameSlugs } from "./build-quiz-state.js";

const VALID_WORKLOADS = new Set(["gaming", "streaming", "creative", "3d", "everyday"]);
const VALID_RESOLUTIONS = new Set(["1080p", "1440p", "4k"]);
const VALID_FRAME_RATES = new Set([60, 120, 165]);
const VALID_SIZE_PREFERENCES = new Set(["any", "compact"]);
const VALID_STRATEGIES = new Set(["lowest", "fewest"]);

function toBase64Url(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return globalThis.btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const encoded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = encoded + "=".repeat((4 - encoded.length % 4) % 4);
  const binary = globalThis.atob(padded);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export function encodeShareHash(payload) {
  try {
    return "#build=" + toBase64Url(JSON.stringify(payload));
  } catch {
    return null;
  }
}

export function decodeShareHash(hash, { components, products, counties = [] } = {}) {
  if (typeof hash !== "string" || !hash.startsWith("#build=")) return null;
  if (!Array.isArray(components) || !Array.isArray(products)) return null;

  try {
    const decoded = JSON.parse(fromBase64Url(hash.slice(7)));
    if (!decoded || typeof decoded !== "object" || Array.isArray(decoded) ||
        !decoded.build || typeof decoded.build !== "object" || Array.isArray(decoded.build)) return null;

    const build = {};
    for (const component of components) {
      const product = products.find(item => item.id === decoded.build[component.id]);
      if (!product || product.category !== component.category) return null;
      build[component.id] = product.id;
    }

    const budget = Number(decoded.budget);
    if (!Number.isFinite(budget) || budget < 400 || budget > 5500) return null;
    if (!VALID_WORKLOADS.has(decoded.workload)) return null;
    const targetResolution = decoded.targetResolution ?? "1080p";
    const targetFrameRate = decoded.targetFrameRate ?? 60;
    const sizePreference = decoded.sizePreference ?? "any";
    const storagePreference = decoded.storagePreference ?? "1tb";
    const strategy = decoded.strategy ?? "lowest";
    const accessories = Array.isArray(decoded.accessories) ? decoded.accessories : [];
    const gameSlugs = normalizeGameSlugs(decoded.gameSlugs);
    const creativeApps = normalizeCreativeApps(decoded.creativeApps);
    const designPreference = decoded.designPreference ?? "performance";
    if (!VALID_RESOLUTIONS.has(targetResolution) || !VALID_FRAME_RATES.has(targetFrameRate) ||
        !VALID_SIZE_PREFERENCES.has(sizePreference) || !isValidStoragePreference(storagePreference) ||
        !["aesthetics", "performance"].includes(designPreference) ||
        gameSlugs.length !== (Array.isArray(decoded.gameSlugs) ? decoded.gameSlugs.length : 0) ||
        creativeApps.length !== (Array.isArray(decoded.creativeApps) ? decoded.creativeApps.length : 0) ||
        !VALID_STRATEGIES.has(strategy) || (decoded.accessories !== undefined && !Array.isArray(decoded.accessories))) return null;

    return {
      build,
      budget,
      workload: decoded.workload,
      targetResolution,
      targetFrameRate,
      sizePreference,
      storagePreference,
      strategy,
      designPreference,
      gameSlugs,
      creativeApps,
      accessories: normalizeAccessories(accessories),
      county: counties.includes(decoded.county) ? decoded.county : undefined
    };
  } catch {
    return null;
  }
}

