import { COUNTIES, COMPONENTS, PRODUCTS } from "./data.js";
import { isValidLocalAccountId, MAX_LOCAL_BACKUP_BYTES } from "./local-account.js";
import { MAX_SAVED_BUILDS } from "./saved-builds.js";
import { ACCESSORY_OPTIONS, estimateAccessories, normalizeAccessories } from "./accessories.js";

export const LOCAL_BACKUP_FORMAT = "rigwise-local-account-backup";
export const LOCAL_BACKUP_VERSION = 1;
const WORKLOADS = new Set(["gaming", "creative", "everyday"]);
const RESOLUTIONS = new Set(["1080p", "1440p", "4k"]);
const FRAME_RATES = new Set([60, 120, 165]);
const SIZE_PREFERENCES = new Set(["any", "compact"]);
const STORAGE_PREFERENCES = new Set(["1tb", "2tb"]);
const STRATEGIES = new Set(["lowest", "fewest"]);
const ACCESSORY_IDS = new Set(ACCESSORY_OPTIONS.map(option => option.id));
const byteLength = value => new TextEncoder().encode(value).length;

function normalizeSavedBuild(item, accountId, index, exportedAt) {
  if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("A saved build is invalid.");
  if (item.accountId && item.accountId !== accountId) throw new Error("A saved build belongs to a different local ID.");
  if (typeof item.name !== "string" || !item.name.trim() || item.name.length > 120) throw new Error("A saved build name is invalid.");
  if (!item.build || typeof item.build !== "object" || Array.isArray(item.build)) throw new Error("A saved build configuration is invalid.");
  const keys = Object.keys(item.build);
  if (keys.length !== COMPONENTS.length || COMPONENTS.some(component => !PRODUCTS.some(product => product.id === item.build[component.id] && product.category === component.category))) {
    throw new Error("A saved build contains an unknown or incomplete component list.");
  }
  if (keys.some(key => !COMPONENTS.some(component => component.id === key))) throw new Error("A saved build contains an unknown component.");

  const budget = Number(item.budget);
  const createdAt = typeof item.createdAt === "string" && Number.isFinite(Date.parse(item.createdAt)) ? item.createdAt : exportedAt;
  return {
    id: typeof item.id === "string" && item.id.trim() && item.id.length <= 128 ? item.id : `backup-${index + 1}`,
    accountId,
    name: item.name.trim(),
    build: Object.fromEntries(COMPONENTS.map(component => [component.id, item.build[component.id]])),
    budget: Number.isFinite(budget) && budget >= 400 && budget <= 5500 ? budget : 1000,
    workload: WORKLOADS.has(item.workload) ? item.workload : "gaming",
    county: COUNTIES.includes(item.county) ? item.county : "Dublin",
    ...(RESOLUTIONS.has(item.targetResolution) ? { targetResolution: item.targetResolution } : {}),
    ...(FRAME_RATES.has(Number(item.targetFrameRate)) ? { targetFrameRate: Number(item.targetFrameRate) } : {}),
    ...(SIZE_PREFERENCES.has(item.sizePreference) ? { sizePreference: item.sizePreference } : {}),
    storagePreference: STORAGE_PREFERENCES.has(item.storagePreference) ? item.storagePreference : "1tb",
    strategy: STRATEGIES.has(item.strategy) ? item.strategy : "lowest",
    accessories: Array.isArray(item.accessories) && item.accessories.every(id => ACCESSORY_IDS.has(id)) ? normalizeAccessories(item.accessories) : [],
    accessoryTotal: Number.isFinite(Number(item.accessoryTotal)) && Number(item.accessoryTotal) >= 0
      ? Number(item.accessoryTotal)
      : estimateAccessories(Array.isArray(item.accessories) ? item.accessories : [], item.targetResolution),
    ...(Number.isFinite(Number(item.total)) && Number(item.total) >= 0 ? { total: Number(item.total) } : {}),
    createdAt,
    ...(typeof item.updatedAt === "string" && Number.isFinite(Date.parse(item.updatedAt)) ? { updatedAt: item.updatedAt } : {})
  };
}

export function createLocalAccountBackup(accountId, savedBuilds, exportedAt = new Date().toISOString()) {
  if (!isValidLocalAccountId(accountId)) throw new Error("A valid local account ID is required.");
  if (!Array.isArray(savedBuilds) || savedBuilds.length > MAX_SAVED_BUILDS) throw new Error("The saved build list is invalid.");
  if (typeof exportedAt !== "string" || !Number.isFinite(Date.parse(exportedAt))) throw new Error("The backup date is invalid.");
  const backup = {
    format: LOCAL_BACKUP_FORMAT,
    version: LOCAL_BACKUP_VERSION,
    exportedAt,
    accountId,
    savedBuilds: savedBuilds.map((item, index) => normalizeSavedBuild(item, accountId, index, exportedAt))
  };
  if (new Set(backup.savedBuilds.map(item => item.id)).size !== backup.savedBuilds.length) throw new Error("The saved builds contain duplicate IDs.");
  const serialized = JSON.stringify(backup, null, 2);
  if (byteLength(serialized) > MAX_LOCAL_BACKUP_BYTES) throw new Error("The backup is too large to save.");
  return serialized;
}

export function parseLocalAccountBackup(serialized) {
  if (typeof serialized !== "string" || byteLength(serialized) > MAX_LOCAL_BACKUP_BYTES) throw new Error("The backup file is too large or unreadable.");
  let backup;
  try {
    backup = JSON.parse(serialized);
  } catch {
    throw new Error("The backup file is not valid JSON.");
  }
  if (!backup || backup.format !== LOCAL_BACKUP_FORMAT || backup.version !== LOCAL_BACKUP_VERSION) {
    throw new Error("This backup format is not supported.");
  }
  if (!isValidLocalAccountId(backup.accountId) || !Number.isFinite(Date.parse(backup.exportedAt))) throw new Error("The backup is missing a valid local ID or date.");
  if (!Array.isArray(backup.savedBuilds) || backup.savedBuilds.length > MAX_SAVED_BUILDS) throw new Error("The backup saved build list is invalid.");
  const savedBuilds = backup.savedBuilds.map((item, index) => normalizeSavedBuild(item, backup.accountId, index, backup.exportedAt));
  if (new Set(savedBuilds.map(item => item.id)).size !== savedBuilds.length) throw new Error("The backup contains duplicate saved build IDs.");
  return { format: backup.format, version: backup.version, exportedAt: backup.exportedAt, accountId: backup.accountId, savedBuilds };
}
