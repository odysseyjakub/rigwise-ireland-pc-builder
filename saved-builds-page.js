import { clearStorageWithPrefix, readStorageValue, removeStorageValue, writeStorageValue } from "./browser-storage.js";
import { createLocalAccountBackup, parseLocalAccountBackup } from "./account-backup.js";
import { getOrCreateLocalAccount, LOCAL_ACCOUNT_STORAGE_KEY, MAX_LOCAL_BACKUP_BYTES, migrateLegacySavedBuilds, savedBuildKeyForAccount } from "./local-account.js";
import { duplicateSavedBuild, MAX_SAVED_BUILDS, renameSavedBuild } from "./saved-builds.js";
import { encodeShareHash } from "./share-state.js";

const $ = selector => document.querySelector(selector);
let account = getOrCreateLocalAccount();
let storageKey = migrateLegacySavedBuilds(account.id).key;
let renameTarget = null;
let toastTimer;

function readBuilds() {
  try {
    const value = JSON.parse(readStorageValue(storageKey) || "[]");
    return Array.isArray(value) ? value.filter(item => item && typeof item.id === "string" && typeof item.name === "string" && item.build && typeof item.build === "object") : [];
  } catch {
    return [];
  }
}

function writeBuilds(builds) {
  return writeStorageValue(storageKey, JSON.stringify(builds));
}

function escapeText(value) {
  return String(value ?? "");
}

function makeShareUrl(item) {
  const hash = encodeShareHash({
    build: item.build,
    budget: item.budget,
    workload: item.workload,
    targetResolution: item.targetResolution,
    targetFrameRate: item.targetFrameRate,
    sizePreference: item.sizePreference,
    storagePreference: item.storagePreference,
    strategy: item.strategy,
    designPreference: item.designPreference,
    gameSlugs: item.gameSlugs,
    creativeApps: item.creativeApps,
    accessories: item.accessories,
    county: item.county
  });
  return hash ? new URL("builder.html" + hash, location.href).href : null;
}

function showToast(message) {
  const toast = $("#saved-page-toast");
  toast.textContent = message;
  toast.classList.add("toast-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("toast-visible"), 2800);
}

function makeButton(label, action, id, extraClass = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "button button-outline saved-page-action " + extraClass;
  button.textContent = label;
  button.dataset.savedAction = action;
  button.dataset.savedId = id;
  return button;
}

function render() {
  const builds = readBuilds();
  $("#saved-account-id").textContent = account.id;
  $("#saved-account-state").textContent = account.persisted
    ? "This ID and its builds are saved in this browser. There is no email, password or automatic cloud sync."
    : "Temporary ID · browser storage is unavailable, so it may change when this page closes.";
  $("#saved-build-count").textContent = builds.length + "/" + MAX_SAVED_BUILDS;
  $("#clear-saved-builds").hidden = builds.length === 0;
  const host = $("#saved-builds-list");
  host.replaceChildren();
  if (!builds.length) {
    const empty = document.createElement("div");
    empty.className = "saved-builds-empty";
    const title = document.createElement("h3");
    title.textContent = "No saved builds yet.";
    const link = document.createElement("a");
    link.className = "button button-dark";
    link.href = "build-quiz.html";
    link.textContent = "Build a PC";
    empty.append(title, link);
    host.append(empty);
    $("#saved-builds-status").textContent = "No saved builds on this browser.";
    return;
  }
  $("#saved-builds-status").textContent = builds.length + (builds.length === 1 ? " build" : " builds") + " saved on this device.";
  for (const item of builds) {
    const card = document.createElement("article");
    card.className = "saved-build-page-card";
    const top = document.createElement("div");
    top.className = "saved-build-page-card-top";
    const info = document.createElement("div");
    const name = document.createElement("h3");
    name.textContent = escapeText(item.name);
    const meta = document.createElement("p");
    const savedDate = Number.isFinite(Date.parse(item.updatedAt || item.createdAt || ""))
      ? new Date(item.updatedAt || item.createdAt).toLocaleDateString("en-IE", { dateStyle: "medium" })
      : "Unknown date";
    const total = Number(item.total);
    const totalText = Number.isFinite(total) ? new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(total) + " illustrative total" : "Example build";
    meta.textContent = savedDate + " · " + totalText + " · stored on this device";
    info.append(name, meta);
    const open = document.createElement("a");
    open.className = "button button-lime";
    const shareUrl = makeShareUrl(item);
    open.href = shareUrl || "builder.html#builder";
    open.textContent = "Open build ↗";
    top.append(info, open);
    const actions = document.createElement("div");
    actions.className = "saved-build-page-actions";
    actions.append(
      makeButton("Copy link", "copy", item.id),
      makeButton("Rename", "rename", item.id),
      makeButton("Duplicate", "duplicate", item.id),
      makeButton("Remove", "remove", item.id, "saved-page-remove")
    );
    card.append(top, actions);
    host.append(card);
  }
}

function newId() {
  const randomUUID = globalThis.crypto?.randomUUID;
  return typeof randomUUID === "function" ? randomUUID.call(globalThis.crypto) : "build-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
}

$("#copy-saved-account-id").addEventListener("click", async () => {
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(account.id);
    showToast("Local account ID copied.");
  } catch {
    showToast("Select the ID and copy it from this panel.");
  }
});

$("#export-account-backup").addEventListener("click", () => {
  try {
    const serialized = createLocalAccountBackup(account.id, readBuilds());
    const file = new Blob([serialized], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rigwise-backup-" + account.id + ".json";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Local ID and saved builds backed up.");
  } catch {
    showToast("A backup could not be created from this browser's saved data.");
  }
});

$("#choose-account-backup").addEventListener("click", () => $("#account-backup-file").click());
$("#account-backup-file").addEventListener("change", async event => {
  const input = event.currentTarget;
  const file = input.files?.[0];
  if (!file) return;
  try {
    if (file.size > MAX_LOCAL_BACKUP_BYTES) throw new Error("Backup exceeds the supported file size.");
    const backup = parseLocalAccountBackup(await file.text());
    const builds = readBuilds();
    if ((builds.length || backup.accountId !== account.id) && !window.confirm("Restore this backup? It will replace this browser's current local ID and saved builds.")) return;
    const nextKey = savedBuildKeyForAccount(backup.accountId);
    const previous = readStorageValue(nextKey);
    if (!writeStorageValue(nextKey, JSON.stringify(backup.savedBuilds))) throw new Error("Storage unavailable");
    if (!writeStorageValue(LOCAL_ACCOUNT_STORAGE_KEY, backup.accountId)) {
      if (previous === null) removeStorageValue(nextKey);
      else writeStorageValue(nextKey, previous);
      throw new Error("Storage unavailable");
    }
    account = { id: backup.accountId, persisted: true, created: false };
    storageKey = nextKey;
    render();
    showToast("Backup restored in this browser.");
  } catch {
    showToast("That backup is invalid or could not be restored.");
  } finally {
    input.value = "";
  }
});

$("#clear-local-data").addEventListener("click", () => {
  if (!window.confirm("Clear this browser's Rigwise ID, saved builds and preferences? Download a backup first if you want to keep your builds.")) return;
  if (!clearStorageWithPrefix("rigwise-")) return showToast("The browser could not clear all Rigwise data.");
  location.reload();
});

$("#saved-builds-list").addEventListener("click", async event => {
  const button = event.target.closest("[data-saved-action]");
  if (!button) return;
  const builds = readBuilds();
  const item = builds.find(build => build.id === button.dataset.savedId);
  if (!item) return;
  if (button.dataset.savedAction === "copy") {
    const shareUrl = makeShareUrl(item);
    if (!shareUrl) return showToast("A share link could not be created for this build.");
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(shareUrl);
      showToast("Build link copied.");
    } catch {
      showToast("Open the build, then copy its address from the browser.");
    }
  } else if (button.dataset.savedAction === "rename") {
    renameTarget = item.id;
    $("#saved-page-name").value = item.name;
    $("#saved-page-dialog-error").hidden = true;
    $("#saved-page-dialog").showModal();
    $("#saved-page-name").focus();
  } else if (button.dataset.savedAction === "duplicate") {
    if (builds.length >= MAX_SAVED_BUILDS) return showToast("Saved-build limit reached. Remove a build first.");
    try {
      const copy = duplicateSavedBuild(item, { id: newId(), accountId: account.id, createdAt: new Date().toISOString() });
      if (!writeBuilds([copy, ...builds])) throw new Error("Storage unavailable");
      render();
      showToast("Build duplicated.");
    } catch {
      showToast("This build could not be duplicated.");
    }
  } else if (button.dataset.savedAction === "remove") {
    if (!writeBuilds(builds.filter(build => build.id !== item.id))) return showToast("Your browser could not update saved builds.");
    render();
    showToast("Build removed from this browser.");
  }
});

$("#saved-page-form").addEventListener("submit", event => {
  event.preventDefault();
  try {
    const updated = renameSavedBuild(readBuilds(), renameTarget, $("#saved-page-name").value, new Date().toISOString());
    if (!writeBuilds(updated)) throw new Error("Storage unavailable");
    $("#saved-page-dialog").close();
    render();
    showToast("Build name updated.");
  } catch (error) {
    $("#saved-page-dialog-error").textContent = error instanceof Error ? error.message : "Enter a valid build name.";
    $("#saved-page-dialog-error").hidden = false;
  }
});
$("#saved-page-cancel").addEventListener("click", () => $("#saved-page-dialog").close());
$("#clear-saved-builds").addEventListener("click", () => {
  if (!window.confirm("Remove all saved builds from this browser? This cannot be undone unless you have a backup.")) return;
  if (!removeStorageValue(storageKey)) return showToast("Your browser could not clear saved builds.");
  render();
  showToast("Saved builds cleared from this browser.");
});

render();
