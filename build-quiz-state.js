const VALID_WORKLOADS = new Set(["gaming", "creative", "everyday"]);
const VALID_RESOLUTIONS = new Set(["1080p", "1440p", "4k"]);
const VALID_FRAME_RATES = new Set([60, 120, 165]);
const VALID_SIZES = new Set(["any", "compact"]);

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
  const targetResolution = params.get("resolution");
  const targetFrameRate = Number(params.get("fps"));
  const sizePreference = params.get("size");
  if (!Number.isInteger(budget) || budget < 700 || budget > 5000 || budget % 50 !== 0 ||
      !VALID_WORKLOADS.has(workload) || !VALID_RESOLUTIONS.has(targetResolution) ||
      !VALID_FRAME_RATES.has(targetFrameRate) || !VALID_SIZES.has(sizePreference)) return null;
  return { budget, workload, targetResolution, targetFrameRate, sizePreference };
}

export function createQuizBuilderQuery(preferences) {
  const params = new URLSearchParams({
    source: "quiz",
    budget: String(preferences.budget),
    workload: preferences.workload,
    resolution: preferences.targetResolution,
    fps: String(preferences.targetFrameRate),
    size: preferences.sizePreference
  });
  return params.toString();
}

