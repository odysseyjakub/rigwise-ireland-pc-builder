import { readStorageValue, removeStorageValue, writeStorageValue } from "./browser-storage.js";

export const LOCAL_ACCOUNT_STORAGE_KEY = "rigwise-local-account-id-v1";
export const LEGACY_SAVED_BUILDS_KEY = "rigwise-demo-builds-v1";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACCOUNT_ID_PATTERN = /^RW-[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/;

function generateUuid() {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") return cryptoApi.randomUUID();

  const bytes = new Uint8Array(16);
  if (typeof cryptoApi?.getRandomValues === "function") {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(value => value.toString(16).padStart(2, "0")).join("");
  return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20);
}

export function isValidLocalAccountId(value) {
  return typeof value === "string" && ACCOUNT_ID_PATTERN.test(value);
}

export function createLocalAccountId(uuidFactory = generateUuid) {
  const uuid = uuidFactory();
  if (typeof uuid !== "string" || !UUID_PATTERN.test(uuid)) throw new Error("The local account ID source returned an invalid UUID");
  return "RW-" + uuid.toUpperCase();
}

export function getOrCreateLocalAccount(storage, uuidFactory = generateUuid) {
  const current = readStorageValue(LOCAL_ACCOUNT_STORAGE_KEY, storage);
  if (isValidLocalAccountId(current)) return { id: current, persisted: true, created: false };

  const id = createLocalAccountId(uuidFactory);
  return { id, persisted: writeStorageValue(LOCAL_ACCOUNT_STORAGE_KEY, id, storage), created: true };
}

export function savedBuildKeyForAccount(accountId) {
  if (!isValidLocalAccountId(accountId)) throw new Error("A valid local account ID is required");
  return "rigwise-saved-builds-v1:" + accountId;
}

export function migrateLegacySavedBuilds(accountId, storage) {
  const accountKey = savedBuildKeyForAccount(accountId);
  const legacyValue = readStorageValue(LEGACY_SAVED_BUILDS_KEY, storage);
  if (legacyValue === null || readStorageValue(accountKey, storage) !== null) {
    return { key: accountKey, migrated: false };
  }
  if (!writeStorageValue(accountKey, legacyValue, storage)) {
    return { key: LEGACY_SAVED_BUILDS_KEY, migrated: false };
  }
  removeStorageValue(LEGACY_SAVED_BUILDS_KEY, storage);
  return { key: accountKey, migrated: true };
}
