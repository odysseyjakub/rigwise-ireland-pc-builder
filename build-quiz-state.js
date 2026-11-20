import { ACCESSORY_OPTIONS, normalizeAccessories } from "./accessories.js";

export const MIN_PC_BUDGET = 400;
export const MAX_PC_BUDGET = 5500;
const VALID_WORKLOADS = new Set(["gaming", "creative", "everyday"]);
const VALID_RESOLUTIONS = new Set(["1080p", "1440p", "4k"]);
const VALID_FRAME_RATES = new Set([60, 120, 165]);
const VALID_SIZES = new Set(["any", "compact"]);
const VALID_STORAGE = new Set(["1tb", "2tb"]);
const VALID_STRATEGIES = new Set(["lowest", "fewest"]);
const ACCESSORY_IDS = new Set(ACCESSORY_OPTIONS.map(option => option.id));

export function readQuizPreferences(search) {
  let params;
  try {
    params = new URLSearchParams(search);
  } catch {
    return null;
  }
  if (params.get("source") !== "quiz") return null;
  const budget = Number(params.get("budget"));
  const workload = params.get("workload");
  const targetResolution = params.get("resolution") ?? "1080p";
  const targetFrameRate = Number(params.get("fps") ?? 60);
  const sizePreference = params.get("size") ?? "any";
  const storagePreference = params.get("storage") ?? "1tb";
  const strategy = params.get("strategy") ?? "lowest";
  const rawAccessories = params.get("peripherals");
  const accessories = rawAccessories ? rawAccessories.split(",") : [];
  if (!Number.isInteger(budget) || budget < MIN_PC_BUDGET || budget > MAX_PC_BUDGET || budget % 50 !== 0 ||
      !VALID_WORKLOADS.has(workload) || !VALID_RESOLUTIONS.has(targetResolution) ||
      !VALID_FRAME_RATES.has(targetFrameRate) || !VALID_SIZES.has(sizePreference) ||
      !VALID_STORAGE.has(storagePreference) || !VALID_STRATEGIES.has(strategy) ||
      accessories.some(id => !ACCESSORY_IDS.has(id))) return null;
  return { budget, workload, targetResolution, targetFrameRate, sizePreference, storagePreference, strategy, accessories: normalizeAccessories(accessories) };
}

export function createQuizBuilderQuery(preferences) {
  const params = new URLSearchParams({
    source: "quiz",
    budget: String(preferences.budget),
    workload: preferences.workload,
    resolution: preferences.targetResolution,
    fps: String(preferences.targetFrameRate),
    size: preferences.sizePreference,
    storage: preferences.storagePreference,
    strategy: preferences.strategy,
    peripherals: normalizeAccessories(preferences.accessories).join(",")
  });
  return params.toString();
}
