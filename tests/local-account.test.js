import test from "node:test";
import assert from "node:assert/strict";
import {
  LEGACY_SAVED_BUILDS_KEY,
  createLocalAccountId,
  getOrCreateLocalAccount,
  isValidLocalAccountId,
  migrateLegacySavedBuilds,
  savedBuildKeyForAccount
} from "../local-account.js";

const uuid = "123e4567-e89b-12d3-a456-426614174000";
const accountId = "RW-123E4567-E89B-12D3-A456-426614174000";

function makeStorage(initial = new Map()) {
  return {
    values: initial,
    getItem(key) { return this.values.has(key) ? this.values.get(key) : null; },
    setItem(key, value) { this.values.set(key, String(value)); },
    removeItem(key) { this.values.delete(key); }
  };
}

test("local account IDs are formatted labels, not login credentials", () => {
  assert.equal(createLocalAccountId(() => uuid), accountId);
  assert.equal(isValidLocalAccountId(accountId), true);
  assert.equal(isValidLocalAccountId("RW-not-a-uuid"), false);
  assert.throws(() => createLocalAccountId(() => "invalid"), /invalid UUID/);
});

test("the same browser reuses its stored anonymous account ID", () => {
  const storage = makeStorage();
  const first = getOrCreateLocalAccount(storage, () => uuid);
  const second = getOrCreateLocalAccount(storage, () => { throw new Error("must reuse stored id"); });

  assert.deepEqual(first, { id: accountId, persisted: true, created: true });
  assert.deepEqual(second, { id: accountId, persisted: true, created: false });
});

test("storage failures yield a clearly temporary ID without escaping", () => {
  const account = getOrCreateLocalAccount(null, () => uuid);
  assert.deepEqual(account, { id: accountId, persisted: false, created: true });
});

test("saved builds migrate from the old browser key to the local account key", () => {
  const legacy = JSON.stringify([{ id: "build-1", name: "Gaming", build: {} }]);
  const storage = makeStorage(new Map([[LEGACY_SAVED_BUILDS_KEY, legacy]]));
  const result = migrateLegacySavedBuilds(accountId, storage);

  assert.deepEqual(result, { key: savedBuildKeyForAccount(accountId), migrated: true });
  assert.equal(storage.getItem(result.key), legacy);
  assert.equal(storage.getItem(LEGACY_SAVED_BUILDS_KEY), null);
});

test("failed account migration keeps the legacy saved builds readable", () => {
  const legacy = "[]";
  const storage = {
    getItem(key) { return key === LEGACY_SAVED_BUILDS_KEY ? legacy : null; },
    setItem() { throw new Error("quota"); },
    removeItem() { throw new Error("blocked"); }
  };
  const result = migrateLegacySavedBuilds(accountId, storage);
  assert.deepEqual(result, { key: LEGACY_SAVED_BUILDS_KEY, migrated: false });
});
