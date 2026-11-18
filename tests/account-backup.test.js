import test from "node:test";
import assert from "node:assert/strict";
import { createLocalAccountBackup, parseLocalAccountBackup } from "../account-backup.js";
import { DEFAULT_BUILD } from "../data.js";

const accountId = "RW-123E4567-E89B-12D3-A456-426614174000";
const exportedAt = "2026-11-18T12:00:00.000Z";
const savedBuild = {
  id: "build-1",
  accountId,
  name: "Gaming · 18/11/2026",
  build: { ...DEFAULT_BUILD },
  budget: 1400,
  workload: "gaming",
  county: "Galway",
  total: 1395.25,
  createdAt: exportedAt
};

test("local backup round-trips the anonymous ID and supported saved builds", () => {
  const serialized = createLocalAccountBackup(accountId, [savedBuild], exportedAt);
  const restored = parseLocalAccountBackup(serialized);

  assert.equal(restored.accountId, accountId);
  assert.equal(restored.savedBuilds.length, 1);
  assert.deepEqual(restored.savedBuilds[0], savedBuild);
});

test("backup normalizes older saved build metadata while preserving its configuration", () => {
  const restored = parseLocalAccountBackup(createLocalAccountBackup(accountId, [{ name: "Older build", build: { ...DEFAULT_BUILD } }], exportedAt));

  assert.equal(restored.savedBuilds[0].accountId, accountId);
  assert.equal(restored.savedBuilds[0].name, "Older build");
  assert.deepEqual(restored.savedBuilds[0].build, DEFAULT_BUILD);
  assert.equal(restored.savedBuilds[0].county, "Dublin");
});

test("backup rejects an unknown schema, malformed data, and incompatible part IDs", () => {
  assert.throws(() => parseLocalAccountBackup("not json"), /valid JSON/);
  assert.throws(() => parseLocalAccountBackup(JSON.stringify({ format: "other", version: 1 })), /not supported/);
  assert.throws(() => createLocalAccountBackup("bad-id", []), /valid local account ID/);
  assert.throws(() => createLocalAccountBackup(accountId, [{ ...savedBuild, build: { ...DEFAULT_BUILD, cpu: "unknown-cpu" } }], exportedAt), /unknown or incomplete/);
  assert.throws(() => createLocalAccountBackup(accountId, [{ ...savedBuild, accountId: "RW-FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF" }], exportedAt), /different local ID/);
  assert.throws(() => createLocalAccountBackup(accountId, [savedBuild, savedBuild], exportedAt), /duplicate IDs/);
});

test("backup enforces the file-size and supported saved-build limits", () => {
  assert.throws(() => parseLocalAccountBackup(" ".repeat(500_001)), /too large/);
  assert.throws(() => createLocalAccountBackup(accountId, Array(9).fill(savedBuild), exportedAt), /saved build list is invalid/);
});

