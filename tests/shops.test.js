import test from "node:test";
import assert from "node:assert/strict";
import { buildShopQuery, handleShopRequest, normalizeShopElement } from "../api/shops.js";

const request = (county = "Dublin", method = "GET") => new Request("https://rigwise.example/api/shops?county=" + encodeURIComponent(county), { method });

test("only allowlisted Irish counties can be placed in the Overpass query", () => {
  const cork = buildShopQuery("Cork");
  assert.match(cork, /name"="County Cork/);
  assert.match(cork, /shop"~"\^\(computer\|electronics\)\$"/);
  assert.match(buildShopQuery("Dublin"), /name"~"\^Dublin Region/);
  assert.throws(() => buildShopQuery('Cork"]["shop'), TypeError);
});

test("shop normalization accepts named computer shops and safe coordinates", () => {
  assert.deepEqual(normalizeShopElement({
    type: "way", id: 25, center: { lat: 53.3, lon: -6.2 },
    tags: { name: "Parts & Bits", shop: "computer", "addr:street": "Main Street", "addr:housenumber": "4", website: "https://parts.example/" }
  }), {
    id: "way/25", name: "Parts & Bits", kind: "Computer shop", address: "4 Main Street",
    website: "https://parts.example/", coordinates: { lat: 53.3, lon: -6.2 }, mapUrl: "https://www.openstreetmap.org/way/25"
  });
  assert.equal(normalizeShopElement({ type: "node", id: 8, lat: 500, lon: 0, tags: { name: "Unmapped", shop: "electronics" } }).coordinates, null);
  assert.equal(normalizeShopElement({ type: "node", id: 8, lat: 0, lon: 0, tags: { name: "Not a shop", shop: "mobile_phone" } }), null);
  assert.equal(normalizeShopElement({ type: "node", id: 8, lat: 0, lon: 0, tags: { name: "Unsafe", shop: "electronics", website: "javascript:alert(1)" } }).website, null);
});

test("lookup rejects invalid inputs without calling the public provider", async () => {
  let calls = 0;
  const response = await handleShopRequest(request("North County"), { fetcher: async () => { calls++; } });
  assert.equal(response.status, 400);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(calls, 0);
});

test("lookup asks the provider with an identifying user agent and caches a normalized result", async () => {
  let call;
  const response = await handleShopRequest(request("Galway"), {
    fetcher: async (url, options) => {
      call = { url, options };
      return new Response(JSON.stringify({ elements: [
        { type: "node", id: 3, lat: 53.27, lon: -9.05, tags: { name: "Galway Computers", shop: "computer" } },
        { type: "node", id: 3, lat: 53.27, lon: -9.05, tags: { name: "Galway Computers", shop: "computer" } },
        { type: "node", id: 4, lat: 53.27, lon: -9.05, tags: { name: "Book shop", shop: "books" } }
      ] }), { status: 200 });
    }
  });
  const data = await response.json();
  assert.equal(call.url, "https://ovp.dresel.systems/api/interpreter");
  assert.match(call.options.headers["User-Agent"], /rigwise-ireland-pc-builder/);
  assert.equal(call.options.method, "POST");
  assert.match(new URLSearchParams(call.options.body.toString()).get("data"), /County Galway/);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "public, s-maxage=21600, stale-while-revalidate=86400");
  assert.equal(data.county, "Galway");
  assert.equal(data.results.length, 1);
  assert.equal(data.results[0].name, "Galway Computers");
});

test("lookup returns a plain service error when the upstream is unavailable or invalid", async () => {
  const unavailable = await handleShopRequest(request("Dublin"), { fetcher: async () => new Response("", { status: 429 }) });
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.headers.get("cache-control"), "no-store");
  const malformed = await handleShopRequest(request("Dublin"), { fetcher: async () => new Response("not json") });
  assert.equal(malformed.status, 502);
});

test("endpoint rejects other HTTP methods", async () => {
  const response = await handleShopRequest(request("Dublin", "POST"));
  assert.equal(response.status, 405);
});
