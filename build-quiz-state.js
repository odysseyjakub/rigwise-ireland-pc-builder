import { ACCESSORY_OPTIONS, normalizeAccessories } from "./accessories.js";
import { FPS_GAMES } from "./fps-estimates.js";

export const MIN_PC_BUDGET = 400;
export const MAX_PC_BUDGET = 5500;
export const VALID_WORKLOADS = new Set(["gaming", "streaming", "creative", "3d", "everyday"]);
const VALID_RESOLUTIONS = new Set(["1080p", "1440p", "4k"]);
const VALID_FRAME_RATES = new Set([60, 120, 165]);
const VALID_SIZES = new Set(["any", "compact"]);
export const MIN_STORAGE_GB = 256;
export const MAX_STORAGE_GB = 8000;
const VALID_STRATEGIES = new Set(["lowest", "fewest"]);
const ACCESSORY_IDS = new Set(ACCESSORY_OPTIONS.map(option => option.id));
const DESIGN_PREFERENCES = new Set(["aesthetics", "performance"]);
export const CREATIVE_APPS = Object.freeze([
  { id: "video", label: "Video editing", examples: "DaVinci Resolve, Premiere Pro" },
  { id: "photo", label: "Photo and graphic design", examples: "Photoshop, Lightroom, Illustrator" },
  { id: "3d", label: "3D and CAD", examples: "Blender, CAD software" },
  { id: "audio", label: "Music and audio", examples: "Ableton, FL Studio, Reaper" },
  { id: "code", label: "Software development", examples: "IDEs, local tools and virtual machines" }
]);
const CREATIVE_APP_IDS = new Set(CREATIVE_APPS.map(app => app.id));

export function normalizeGameSlugs(values) {
  const selected = new Set(Array.isArray(values) ? values : []);
  return FPS_GAMES.filter(game => selected.has(game.slug)).map(game => game.slug);
}

export function normalizeCreativeApps(values) {
  const selected = new Set(Array.isArray(values) ? values : []);
  return CREATIVE_APPS.filter(app => selected.has(app.id)).map(app => app.id);
}

export function storageGigabytes(preference) {
  if (typeof preference !== "string") return null;
  const match = preference.toLowerCase().match(/^(\d+(?:\.\d+)?)(gb|tb)$/);
  if (!match) return null;
  const amount = Number(match[1]) * (match[2] === "tb" ? 1000 : 1);
  return Number.isInteger(amount) && amount >= MIN_STORAGE_GB && amount <= MAX_STORAGE_GB ? amount : null;
}

export function isValidStoragePreference(preference) {
  return storageGigabytes(preference) !== null;
}

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
  const rawGames = params.get("games");
  const gameSlugs = normalizeGameSlugs(rawGames ? rawGames.split(",") : []);
  const rawApps = params.get("apps");
  const creativeApps = normalizeCreativeApps(rawApps ? rawApps.split(",") : []);
  const designPreference = params.get("design") ?? "performance";
  if (!Number.isInteger(budget) || budget < MIN_PC_BUDGET || budget > MAX_PC_BUDGET || budget % 50 !== 0 ||
      !VALID_WORKLOADS.has(workload) || !VALID_RESOLUTIONS.has(targetResolution) ||
      !VALID_FRAME_RATES.has(targetFrameRate) || !VALID_SIZES.has(sizePreference) ||
      !isValidStoragePreference(storagePreference) || !VALID_STRATEGIES.has(strategy) ||
      !DESIGN_PREFERENCES.has(designPreference) || accessories.some(id => !ACCESSORY_IDS.has(id)) ||
      gameSlugs.length !== (rawGames ? rawGames.split(",").length : 0) ||
      creativeApps.length !== (rawApps ? rawApps.split(",").length : 0)) return null;
  if (["gaming", "streaming"].includes(workload) && rawGames && !gameSlugs.length) return null;
  return { budget, workload, targetResolution, targetFrameRate, sizePreference, storagePreference, strategy, designPreference, gameSlugs, creativeApps, accessories: normalizeAccessories(accessories) };
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
    strategy: preferences.strategy || "lowest",
    peripherals: normalizeAccessories(preferences.accessories).join(","),
    design: preferences.designPreference || "performance",
    games: normalizeGameSlugs(preferences.gameSlugs).join(","),
    apps: normalizeCreativeApps(preferences.creativeApps).join(",")
  });
  return params.toString();
}

