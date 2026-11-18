import { COUNTIES } from "../data.js";

const OVERPASS_URL = "https://ovp.dresel.systems/api/interpreter";
const CACHE_CONTROL = "public, s-maxage=21600, stale-while-revalidate=86400";
const MAX_PROVIDER_BYTES = 1_500_000;
const MAX_RESULTS = 80;
const COUNTY_AREA_NAMES = new Map(COUNTIES.map(county => [county, "County " + county]));
COUNTY_AREA_NAMES.set("Dublin", null);

function jsonResponse(payload, status, cache = false) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cache ? CACHE_CONTROL : "no-store"
    }
  });
}

export function buildShopQuery(county) {
  if (!COUNTIES.includes(county)) throw new TypeError("Choose a county in the Republic of Ireland.");
  const countyArea = county === "Dublin"
    ? '(area["name"~"^Dublin Region"]["boundary"="administrative"]["admin_level"="6"];' +
      'area["name"="Dublin City"]["boundary"="administrative"]["admin_level"="7"];' +
      'area["name"="County Fingal"]["boundary"="administrative"]["admin_level"="7"];' +
      'area["name"="County South Dublin"]["boundary"="administrative"]["admin_level"="7"];' +
      'area["name"="County Dún Laoghaire-Rathdown"]["boundary"="administrative"]["admin_level"="7"];) ->.county;'
    : 'area["name"="' + COUNTY_AREA_NAMES.get(county) + '"]["boundary"="administrative"]["admin_level"="6"]->.county;';
  return "[out:json][timeout:15];\n" + countyArea + "\n(" +
    'node(area.county)["shop"~"^(computer|electronics)$"]["name"];' +
    'way(area.county)["shop"~"^(computer|electronics)$"]["name"];' +
    'relation(area.county)["shop"~"^(computer|electronics)$"]["name"];' +
    ");\nout center tags " + MAX_RESULTS + ";";
}

function safeWebsite(value) {
  if (typeof value !== "string" || value.length > 500) return null;
  try {
    const url = new URL(value.startsWith("www.") ? "https://" + value : value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

function elementAddress(tags) {
  const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  return [street, tags["addr:suburb"], tags["addr:town"] || tags["addr:city"] || tags["addr:village"], tags["addr:postcode"]]
    .filter(Boolean)
    .join(", ")
    .slice(0, 240);
}

export function normalizeShopElement(element) {
  if (!element || !["node", "way", "relation"].includes(element.type) || !Number.isSafeInteger(element.id)) return null;
  const tags = element.tags && typeof element.tags === "object" ? element.tags : {};
  if (!tags.name || !["computer", "electronics"].includes(tags.shop)) return null;
  const lat = Number(element.lat ?? element.center?.lat);
  const lon = Number(element.lon ?? element.center?.lon);
  const coordinates = Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
    ? { lat, lon }
    : null;
  return {
    id: element.type + "/" + element.id,
    name: String(tags.name).slice(0, 160),
    kind: tags.shop === "computer" ? "Computer shop" : "Electronics shop",
    address: elementAddress(tags),
    website: safeWebsite(tags.website || tags["contact:website"]),
    coordinates,
    mapUrl: "https://www.openstreetmap.org/" + element.type + "/" + element.id
  };
}

export async function handleShopRequest(request, { fetcher = fetch } = {}) {
  const url = new URL(request.url);
  if (request.method !== "GET") return jsonResponse({ error: "This endpoint accepts GET requests only." }, 405);
  const county = url.searchParams.get("county");
  if (!COUNTIES.includes(county)) return jsonResponse({ error: "Choose a supported Republic of Ireland county." }, 400);

  try {
    const response = await fetcher(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": "RigwiseIrelandPCBuilder/0.1 (https://github.com/odysseyjakub/rigwise-ireland-pc-builder)"
      },
      body: new URLSearchParams({ data: buildShopQuery(county) }),
      signal: AbortSignal.timeout(20_000)
    });
    if (!response.ok) return jsonResponse({ error: "The public map service is temporarily unavailable. Try again later." }, 503);
    const body = await response.text();
    if (body.length > MAX_PROVIDER_BYTES) return jsonResponse({ error: "The public map service returned too much data. Try again later." }, 502);
    const data = JSON.parse(body);
    if (typeof data.remark === "string") throw new Error("The public map service could not complete this lookup");
    if (!Array.isArray(data.elements)) throw new Error("Invalid public map response");
    const unique = new Map();
    for (const element of data.elements) {
      const result = normalizeShopElement(element);
      if (result) unique.set(result.id, result);
    }
    const results = [...unique.values()].sort((a, b) => a.name.localeCompare(b.name, "en-IE"));
    return jsonResponse({
      county,
      source: "OpenStreetMap contributors",
      dataTimestamp: typeof data.osm3s?.timestamp_osm_base === "string" ? data.osm3s.timestamp_osm_base : null,
      capped: results.length >= MAX_RESULTS,
      results
    }, 200, true);
  } catch {
    return jsonResponse({ error: "The public map service could not be reached. Try again later." }, 502);
  }
}

export default { fetch: handleShopRequest };
