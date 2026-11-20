export const FPS_GAMES = [
  { name: "Cyberpunk 2077", slug: "cyberpunk-2077" },
  { name: "Fortnite", slug: "fortnite" },
  { name: "Counter-Strike 2", slug: "cs2" },
  { name: "GTA V", slug: "gta-v" },
  { name: "Helldivers 2", slug: "helldivers-2" }
];

export const FPS_RESOLUTIONS = ["1080p", "1440p", "4K"];
const API_BASE = "https://fpshq.com/api/v1/fps";

export function fpsRequestUrl({ gameSlug, gpuSlug, cpuSlug, resolution, preset = "high" }) {
  if (!FPS_RESOLUTIONS.includes(resolution)) throw new TypeError("Unsupported FPS resolution.");
  if (![gameSlug, gpuSlug, cpuSlug].every(value => typeof value === "string" && /^[a-z0-9-]+$/i.test(value))) {
    throw new TypeError("FPS hardware and game slugs are required.");
  }
  const url = new URL(API_BASE);
  url.searchParams.set("game", gameSlug);
  url.searchParams.set("gpu", gpuSlug);
  url.searchParams.set("cpu", cpuSlug);
  url.searchParams.set("res", resolution);
  url.searchParams.set("preset", preset);
  return url;
}

function safeFpshqUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "fpshq.com" ? url.href : null;
  } catch {
    return null;
  }
}

export function normalizeFpsResponse(data) {
  if (!data || data.ok !== true || !Number.isFinite(data.fps) || data.fps < 0) {
    throw new TypeError("FPSHQ did not return a usable result.");
  }
  if (data.source !== "benchmark" && data.source !== "prediction") {
    throw new TypeError("FPSHQ returned an unknown result source.");
  }
  const minimum = Number.isFinite(data.fps_min) && data.fps_min >= 0 ? data.fps_min : null;
  const maximum = Number.isFinite(data.fps_max) && data.fps_max >= 0 ? data.fps_max : null;
  return {
    fps: data.fps,
    minimum,
    maximum,
    source: data.source,
    sourceUrl: safeFpshqUrl(data.url)
  };
}

export async function requestFpsEstimate({ gameSlug, gpuSlug, cpuSlug, resolution, fetcher = globalThis.fetch }) {
  if (typeof fetcher !== "function") throw new TypeError("Fetch is unavailable.");
  const url = fpsRequestUrl({ gameSlug, gpuSlug, cpuSlug, resolution });
  const response = await fetcher(url.href, {
    method: "GET",
    headers: { Accept: "application/json" },
    mode: "cors",
    cache: "force-cache",
    referrerPolicy: "no-referrer",
    signal: AbortSignal.timeout(15_000)
  });
  if (!response?.ok) throw new Error("FPSHQ request failed.");
  return normalizeFpsResponse(await response.json());
}

export async function fetchBuildFps({ cpu, gpu, fetcher = globalThis.fetch }) {
  if (!cpu?.fpsCpuSlug || !gpu?.fpsGpuSlug) throw new TypeError("This build is missing an FPS hardware match.");
  const query = new URLSearchParams({ cpu: cpu.fpsCpuSlug, gpu: gpu.fpsGpuSlug });
  const response = await fetcher("/api/fps?" + query, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "force-cache",
    referrerPolicy: "no-referrer"
  });
  if (!response?.ok) throw new Error("The Rigwise FPS endpoint could not be reached.");
  const payload = await response.json();
  if (!payload || payload.ok !== true || !Array.isArray(payload.rows)) {
    throw new TypeError("The Rigwise FPS endpoint returned an invalid response.");
  }
  return FPS_GAMES.map(game => {
    const row = payload.rows.find(candidate => candidate?.slug === game.slug);
    const resolutions = FPS_RESOLUTIONS.map(resolution => {
      const cell = row?.resolutions?.find(candidate => candidate?.resolution === resolution);
      if (cell?.status !== "available") return { status: "unavailable" };
      try {
        return {
          status: "available",
          ...normalizeFpsResponse({
            ok: true,
            fps: cell.fps,
            fps_min: cell.minimum,
            fps_max: cell.maximum,
            source: cell.source,
            url: cell.sourceUrl
          })
        };
      } catch {
        return { status: "unavailable" };
      }
    });
    return { ...game, resolutions };
  });
}

