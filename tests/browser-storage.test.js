import test from "node:test";
import assert from "node:assert/strict";
import { readStorageValue, removeStorageValue, writeStorageValue } from "../browser-storage.js";

test("browser storage helpers read, write, and remove saved values", () => {
  const values = new Map();
  const storage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
  assert.equal(readStorageValue("builds", storage), null);
  assert.equal(writeStorageValue("builds", "[1]", storage), true);
  assert.equal(readStorageValue("builds", storage), "[1]");
  assert.equal(removeStorageValue("builds", storage), true);
  assert.equal(readStorageValue("builds", storage), null);
});

test("storage access errors fail closed without escaping to the UI", () => {
  const storage = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("quota"); },
    removeItem() { throw new Error("blocked"); }
  };
  assert.equal(readStorageValue("builds", storage), null);
  assert.equal(writeStorageValue("builds", "[]", storage), false);
  assert.equal(removeStorageValue("builds", storage), false);
  assert.equal(readStorageValue("builds", null), null);
  assert.equal(writeStorageValue("builds", "[]", null), false);
});
