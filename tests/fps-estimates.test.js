import test from "node:test";
import assert from "node:assert/strict";
import { fetchBuildFps, FPS_GAMES, FPS_RESOLUTIONS, fpsRequestUrl, normalizeFpsResponse, requestFpsEstimate } from "../fps-estimates.js";

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

test("FPS response preserves measured versus modeled provenance and rejects unsafe links", () => {
  assert.deepEqual(normalizeFpsResponse({
    ok: true, fps: 91, fps_min: 75, fps_max: 110, source: "prediction", url: "https://example.com/fake"
  }), { fps: 91, minimum: 75, maximum: 110, source: "prediction", sourceUrl: null });
  assert.throws(() => normalizeFpsResponse({ ok: true, fps: 91, source: "unknown" }));
});

test("FPS request sends no page referrer and validates the response", async () => {
  let request;
  const result = await requestFpsEstimate({
    gameSlug: "cyberpunk-2077", gpuSlug: "rx-7600", cpuSlug: "ryzen-5-7600", resolution: "1080p",
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
    gpu: { fpsGpuSlug: "rx-7600" },
    fetcher: async url => {
      requests.push(url);
      const resolution = new URL(url).searchParams.get("res");
      if (resolution === "1440p") return { ok: false };
      return { ok: true, json: async () => ({ ok: true, fps: 88, source: "prediction", url: "https://fpshq.com/games/test/" }) };
    }
  });
  assert.equal(requests.length, 15);
  assert.equal(rows.length, 5);
  assert.equal(rows[0].resolutions[0].status, "available");
  assert.equal(rows[0].resolutions[1].status, "unavailable");
  assert.equal(rows[0].resolutions[2].status, "available");
});

