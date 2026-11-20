import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_BUILD } from "../data.js";
import {
  createSavedBuildSnapshot,
  duplicateSavedBuild,
  MAX_SAVED_BUILDS,
  prependSavedBuild,
  renameSavedBuild
} from "../saved-builds.js";

const accountId = "RW-123E4567-E89B-12D3-A456-426614174000";
const createdAt = "2026-11-20T10:00:00.000Z";
const build = {
  id: "build-1",
  accountId,
  name: "Quiet 1440p build",
  build: { ...DEFAULT_BUILD },
  budget: 1600,
  workload: "gaming",
  targetResolution: "1440p",
  targetFrameRate: 120,
  sizePreference: "compact",
  storagePreference: "2tb",
  strategy: "fewest",
  accessories: ["keyboard", "monitor"],
  accessoryTotal: 275,
  county: "Galway",
  total: 1580.75,
  createdAt,
  updatedAt: createdAt
};

test("saved build snapshots preserve the anonymous account and every builder choice", () => {
  const snapshot = createSavedBuildSnapshot(build);

  assert.deepEqual(snapshot, build);
  assert.notEqual(snapshot.build, build.build);
  assert.equal(snapshot.accountId, accountId);
});

test("duplicating a saved build creates a new browser-local identity and keeps its settings", () => {
  const copiedAt = "2026-11-20T11:00:00.000Z";
  const copy = duplicateSavedBuild(build, { id: "build-2", accountId, createdAt: copiedAt });

  assert.equal(copy.id, "build-2");
  assert.equal(copy.accountId, accountId);
  assert.equal(copy.name, "Quiet 1440p build (copy)");
  assert.equal(copy.createdAt, copiedAt);
  assert.equal(copy.updatedAt, copiedAt);
  assert.deepEqual(copy.build, build.build);
  assert.equal(copy.targetResolution, build.targetResolution);
  assert.equal(copy.targetFrameRate, build.targetFrameRate);
  assert.equal(copy.sizePreference, build.sizePreference);
  assert.notEqual(copy.build, build.build);
});

test("rename updates the name and timestamp without changing the source list", () => {
  const saved = [build];
  const renamed = renameSavedBuild(saved, build.id, "Quiet work and gaming", "2026-11-20T12:00:00.000Z");

  assert.equal(saved[0].name, "Quiet 1440p build");
  assert.equal(renamed[0].name, "Quiet work and gaming");
  assert.equal(renamed[0].updatedAt, "2026-11-20T12:00:00.000Z");
  assert.deepEqual(renamed[0].build, build.build);
});

test("the eight-build limit refuses a ninth save without evicting an existing build", () => {
  const saved = Array.from({ length: MAX_SAVED_BUILDS }, (_, index) => ({ ...build, id: "build-" + index }));
  const before = saved.map(item => item.id);

  assert.equal(prependSavedBuild(saved, { ...build, id: "build-new" }), null);
  assert.deepEqual(saved.map(item => item.id), before);
  assert.equal(saved.length, MAX_SAVED_BUILDS);
});

test("saved build helpers reject invalid names, identities, and duplicate IDs", () => {
  assert.throws(() => createSavedBuildSnapshot({ ...build, name: "   " }), /1 to 120 characters/);
  assert.throws(() => createSavedBuildSnapshot({ ...build, name: "x".repeat(121) }), /1 to 120 characters/);
  assert.throws(() => createSavedBuildSnapshot({ ...build, accountId: "not-an-id" }), /valid local account ID/);
  assert.throws(() => renameSavedBuild([build], "missing", "A name", createdAt), /could not be found/);
  assert.throws(() => prependSavedBuild([build], build), /IDs must be unique/);
});
