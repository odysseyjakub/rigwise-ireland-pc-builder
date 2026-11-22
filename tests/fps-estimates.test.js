import test from "node:test";
import assert from "node:assert/strict";
import { classifyFpsFailure, fetchBuildFps, FPS_GAMES, FPS_RESOLUTIONS, fpsRequestUrl, normalizeFpsResponse, requestFpsEstimate } from "../fps-estimates.js";
import { handleFpsRequest } from "../api/fps.js";
import { PRODUCTS } from "../data.js";

test("FPS panel covers the chosen five games and three resolutions", () => {
  assert.deepEqual(FPS_GAMES.map(game => game.name), [
    "Cyberpunk 2077", "Fortnite", "Counter-Strike 2", "GTA V", "Helldivers 2"
  ]);
  assert.deepEqual(FPS_RESOLUTIONS, ["1080p", "1440p", "4K"]);
});

test("FPS request includes selected hardware, resolution, and the high preset", () => {
  const url = fpsRequestUrl({ gameSlug: "cs2", gpuSlug: "rtx-4060", cpuSlug: "ryzen-5-7600", resolution: "1440p" });
  assert.equal(url.origin, "https://fpshq.com");
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    game: "cs2", gpu: "rtx-4060", cpu: "ryzen-5-7600", res: "1440p", preset: "high"
  });
  assert.throws(() => fpsRequestUrl({ gameSlug: "bad slug", gpuSlug: "rtx-4060", cpuSlug: "cpu", resolution: "1080p" }));
});

test("FPS hardware slugs match the official FPSHQ catalogue", () => {
  assert.equal(PRODUCTS.find(product => product.id === "gpu-starter").fpsGpuSlug, "radeon-rx-7600");
  assert.equal(PRODUCTS.find(product => product.id === "gpu-mid").fpsGpuSlug, "rtx-4060");
  assert.equal(PRODUCTS.find(product => product.id === "gpu-performance").fpsGpuSlug, "radeon-rx-7700-xt");
});

test("FPS response preserves measured versus modeled provenance and rejects unsafe links", () => {
  assert.deepEqual(normalizeFpsResponse({
    ok: true, fps: 91, fps_min: 75, fps_max: 110, source: "prediction", basis: "model", url: "https://example.com/fake"
  }), { fps: 91, minimum: 75, maximum: 110, source: "prediction", basis: "model", sourceUrl: null });
  assert.equal(normalizeFpsResponse({
    ok: true, fps: 91, source: "prediction", basis: "aggregate", url: "https://fpshq.com/games/cyberpunk-2077/"
  }).basis, "aggregate");
  assert.throws(() => normalizeFpsResponse({ ok: true, fps: 91, source: "unknown" }));
});

test("FPS failures distinguish an untrusted network path from unavailable provider data", () => {
  assert.equal(classifyFpsFailure(new TypeError("fetch failed", { cause: { code: "CERT_AUTHORITY_INVALID" } })), "network");
  assert.equal(classifyFpsFailure(new Error("FPSHQ request failed (HTTP 503).")), "http-503");
  assert.equal(classifyFpsFailure(new Error("FPSHQ request failed (HTTP 404). GPU not found")), "model-not-found");
  assert.equal(classifyFpsFailure(new Error("Unknown source")), "unavailable");
});

test("FPS request sends no page referrer and validates the response", async () => {
  let request;
  const result = await requestFpsEstimate({
    gameSlug: "cyberpunk-2077", gpuSlug: "radeon-rx-7600", cpuSlug: "ryzen-5-7600", resolution: "1080p",
    fetcher: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ ok: true, fps: 74, source: "benchmark", url: "https://fpshq.com/games/cyberpunk-2077/" }) };
    }
  });
  assert.equal(new URL(request.url).searchParams.get("game"), "cyberpunk-2077");
  assert.equal(request.options.referrerPolicy, "no-referrer");
  assert.equal(request.options.cache, "force-cache");
  assert.equal(result.source, "benchmark");
});

test("build estimate failures are isolated per game and resolution", async () => {
  const requests = [];
  const rows = await fetchBuildFps({
    cpu: { fpsCpuSlug: "ryzen-5-7600" },
    gpu: { fpsGpuSlug: "radeon-rx-7600" },
    fetcher: async (url, options) => {
      requests.push({ url, options });
      return { ok: true, json: async () => ({
        ok: true,
        rows: FPS_GAMES.map(game => ({
          ...game,
          resolutions: FPS_RESOLUTIONS.map(resolution => resolution === "1440p"
            ? { resolution, status: "unavailable" }
            : { resolution, status: "available", fps: 88, source: "prediction", sourceUrl: "https://fpshq.com/games/test/" })
        }))
      }) };
    }
  });
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /^\/api\/fps\?/);
  assert.equal(requests[0].options.referrerPolicy, "no-referrer");
  assert.equal(rows.length, 5);
  assert.equal(rows[0].resolutions[0].status, "available");
  assert.equal(rows[0].resolutions[1].status, "unavailable");
  assert.equal(rows[0].resolutions[2].status, "available");
});

test("build FPS requests only the games selected in the questionnaire", async () => {
  const rows = await fetchBuildFps({
    cpu: { fpsCpuSlug: "ryzen-5-7600" },
    gpu: { fpsGpuSlug: "radeon-rx-7600" },
    gameSlugs: ["cs2", "fortnite"],
    fetcher: async () => ({ ok: true, json: async () => ({
      ok: true,
      rows: FPS_GAMES.map(game => ({
        ...game,
        resolutions: FPS_RESOLUTIONS.map(resolution => ({
          resolution, status: "available", fps: 88, source: "prediction", sourceUrl: "https://fpshq.com/games/test/"
        }))
      }))
    }) })
  });
  assert.deepEqual(rows.map(game => game.slug), ["fortnite", "cs2"]);
});

test("Vercel FPS endpoint restricts input to catalogue parts and rejects other methods", async () => {
  let calls = 0;
  const method = await handleFpsRequest(new Request("https://rigwise.test/api/fps?cpu=ryzen-5-7600&gpu=radeon-rx-7600", { method: "POST" }), {
    fetcher: async () => { calls += 1; return { ok: false }; }
  });
  assert.equal(method.status, 405);
  const invalid = await handleFpsRequest(new Request("https://rigwise.test/api/fps?cpu=arbitrary&gpu=localhost"), {
    fetcher: async () => { calls += 1; return { ok: false }; }
  });
  assert.equal(invalid.status, 400);
  assert.equal(calls, 0);
});

test("Vercel FPS endpoint returns sourced results and safely isolates upstream failures", async () => {
  const seen = [];
  const response = await handleFpsRequest(new Request("https://rigwise.test/api/fps?cpu=ryzen-5-7600&gpu=radeon-rx-7600"), {
    fetcher: async (url, options) => {
      seen.push({ url, options });
      const requested = new URL(url);
      if (requested.searchParams.get("res") === "1440p") return { ok: false, status: 503, text: async () => "not json" };
      return {
        ok: true,
        json: async () => ({ ok: true, fps: 88, fps_min: 77, fps_max: 99, source: "prediction", basis: "aggregate", url: "https://fpshq.com/games/cyberpunk-2077/" })
      };
    }
  });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(seen.length, 15);
  assert.ok(seen.every(request => request.options.signal instanceof AbortSignal));
  assert.equal(payload.rows.length, 5);
  assert.equal(payload.rows[0].resolutions[0].source, "prediction");
  assert.equal(payload.rows[0].resolutions[0].basis, "aggregate");
  assert.equal(payload.rows[0].resolutions[1].status, "unavailable");
  assert.equal(payload.rows[0].resolutions[1].reason, "http-503");
});
