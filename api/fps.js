import { PRODUCTS } from "../data.js";
import { requestFpsEstimate, FPS_GAMES, FPS_RESOLUTIONS } from "../fps-estimates.js";

const SUCCESS_CACHE_CONTROL = "public, s-maxage=3600, stale-while-revalidate=3600";

function jsonResponse(payload, status, cache = false) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cache ? SUCCESS_CACHE_CONTROL : "no-store"
    }
  });
}

export async function handleFpsRequest(request, { fetcher = fetch } = {}) {
  const url = new URL(request.url);
  if (request.method !== "GET") return jsonResponse({ error: "This endpoint accepts GET requests only." }, 405);
  const cpuSlug = url.searchParams.get("cpu");
  const gpuSlug = url.searchParams.get("gpu");
  const cpu = PRODUCTS.find(product => product.category === "cpu" && product.fpsCpuSlug === cpuSlug);
  const gpu = PRODUCTS.find(product => product.category === "graphics" && product.fpsGpuSlug === gpuSlug);
  if (!cpu || !gpu) return jsonResponse({ error: "Choose a supported processor and graphics card." }, 400);

  const failures = [];
  const rows = await Promise.all(FPS_GAMES.map(async game => {
    const resolutions = await Promise.all(FPS_RESOLUTIONS.map(async resolution => {
      try {
        const result = await requestFpsEstimate({
          gameSlug: game.slug,
          cpuSlug: cpu.fpsCpuSlug,
          gpuSlug: gpu.fpsGpuSlug,
          resolution,
          fetcher
        });
        return { resolution, status: "available", ...result };
      } catch (error) {
        failures.push(error);
        return { resolution, status: "unavailable" };
      }
    }));
    return { ...game, resolutions };
  }));
  const complete = rows.every(game => game.resolutions.every(result => result.status === "available"));
  if (!complete && failures.length && process.env.VERCEL) {
    const firstFailure = failures[0];
    console.error("FPSHQ lookup incomplete", {
      failures: failures.length,
      error: firstFailure instanceof Error ? firstFailure.name : "UnknownError",
      message: String(firstFailure instanceof Error ? firstFailure.message : "Unknown failure").slice(0, 160)
    });
  }
  return jsonResponse({ ok: true, rows }, 200, complete);
}

export default { fetch: handleFpsRequest };

