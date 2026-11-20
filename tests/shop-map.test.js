import test from "node:test";
import assert from "node:assert/strict";
import { buildShopMapPreviewUrl } from "../shop-map.js";

test("map preview URL opens one Irish OpenStreetMap record without loading map tiles before selection", () => {
  const parsed = new URL(buildShopMapPreviewUrl({ lat: 53.2707, lon: -9.0568 }));

  assert.equal(parsed.origin, "https://www.openstreetmap.org");
  assert.equal(parsed.pathname, "/export/embed.html");
  assert.equal(parsed.searchParams.get("layer"), "mapnik");
  assert.equal(parsed.searchParams.get("marker"), "53.2707,-9.0568");
  assert.deepEqual(parsed.searchParams.get("bbox").split(",").map(Number), [-9.0748, 53.2587, -9.0388, 53.2827]);
});

test("map preview rejects missing, malformed, and non-Irish coordinates", () => {
  assert.equal(buildShopMapPreviewUrl(null), null);
  assert.equal(buildShopMapPreviewUrl({ lat: "north", lon: -6.2 }), null);
  assert.equal(buildShopMapPreviewUrl({ lat: 53.2, lon: 2 }), null);
  assert.equal(buildShopMapPreviewUrl({ lat: 91, lon: -6.2 }), null);
});

