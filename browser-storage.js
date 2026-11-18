function resolveStorage(storage) {
  if (storage !== undefined) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function readStorageValue(key, storage) {
  try {
    return resolveStorage(storage)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeStorageValue(key, value, storage) {
  try {
    const target = resolveStorage(storage);
    if (!target) return false;
    target.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeStorageValue(key, storage) {
  try {
    const target = resolveStorage(storage);
    if (!target) return false;
    target.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function clearStorageWithPrefix(prefix, storage) {
  if (typeof prefix !== "string" || prefix === "") return false;
  try {
    const target = resolveStorage(storage);
    if (!target || typeof target.key !== "function") return false;
    const keys = [];
    for (let index = 0; index < target.length; index += 1) {
      const key = target.key(index);
      if (typeof key === "string" && key.startsWith(prefix)) keys.push(key);
    }
    for (const key of keys) target.removeItem(key);
    return keys.every(key => target.getItem(key) === null);
  } catch {
    return false;
  }
}
