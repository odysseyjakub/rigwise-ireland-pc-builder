import { isValidLocalAccountId } from "./local-account.js";
import { estimateAccessories, normalizeAccessories } from "./accessories.js";
import { normalizeCreativeApps, normalizeGameSlugs } from "./build-quiz-state.js";

export const MAX_SAVED_BUILDS = 8;
export const MAX_SAVED_BUILD_NAME_LENGTH = 120;

function validateName(name) {
  if (typeof name !== "string" || !name.trim() || name.trim().length > MAX_SAVED_BUILD_NAME_LENGTH) {
    throw new Error("Build names must contain 1 to 120 characters.");
  }
  return name.trim();
}

function validateIdentity({ id, accountId, createdAt }) {
  if (typeof id !== "string" || !id.trim() || id.length > 128) throw new Error("A saved build needs a unique ID.");
  if (!isValidLocalAccountId(accountId)) throw new Error("A valid local account ID is required.");
  if (typeof createdAt !== "string" || !Number.isFinite(Date.parse(createdAt))) throw new Error("A valid save time is required.");
}

export function createSavedBuildSnapshot({
  id,
  accountId,
  name,
  build,
  budget,
  workload,
  targetResolution,
  targetFrameRate,
  sizePreference,
  storagePreference = "1tb",
  strategy = "lowest",
  designPreference = "performance",
  gameSlugs = [],
  creativeApps = [],
  accessories = [],
  accessoryTotal,
  county,
  total,
  createdAt
}) {
  validateIdentity({ id, accountId, createdAt });
  if (!build || typeof build !== "object" || Array.isArray(build)) throw new Error("A saved build configuration is required.");
  return {
    id,
    accountId,
    name: validateName(name),
    build: { ...build },
    budget,
    workload,
    targetResolution,
    targetFrameRate,
    sizePreference,
    storagePreference,
    strategy,
    designPreference: ["aesthetics", "performance"].includes(designPreference) ? designPreference : "performance",
    gameSlugs: normalizeGameSlugs(gameSlugs),
    creativeApps: normalizeCreativeApps(creativeApps),
    accessories: normalizeAccessories(accessories),
    accessoryTotal: Number.isFinite(accessoryTotal) && accessoryTotal >= 0 ? accessoryTotal : estimateAccessories(accessories, targetResolution),
    county,
    total,
    createdAt,
    updatedAt: createdAt
  };
}

export function duplicateSavedBuild(source, { id, accountId, createdAt }) {
  if (!source || typeof source !== "object") throw new Error("Choose a saved build to duplicate.");
  validateIdentity({ id, accountId, createdAt });
  const copySuffix = " (copy)";
  const baseName = validateName(source.name).slice(0, MAX_SAVED_BUILD_NAME_LENGTH - copySuffix.length).trimEnd();
  return {
    ...source,
    id,
    accountId,
    name: baseName + copySuffix,
    build: { ...source.build },
    createdAt,
    updatedAt: createdAt
  };
}

export function renameSavedBuild(savedBuilds, id, name, updatedAt) {
  const normalizedName = validateName(name);
  if (typeof updatedAt !== "string" || !Number.isFinite(Date.parse(updatedAt))) throw new Error("A valid update time is required.");
  let found = false;
  const result = savedBuilds.map(item => {
    if (item.id !== id) return item;
    found = true;
    return { ...item, name: normalizedName, updatedAt };
  });
  if (!found) throw new Error("The saved build could not be found.");
  return result;
}

export function prependSavedBuild(savedBuilds, item) {
  if (!Array.isArray(savedBuilds)) throw new Error("The saved build list is invalid.");
  if (savedBuilds.length >= MAX_SAVED_BUILDS) return null;
  if (savedBuilds.some(saved => saved.id === item?.id)) throw new Error("Saved build IDs must be unique.");
  return [item, ...savedBuilds];
}

