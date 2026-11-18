import test from "node:test";
import assert from "node:assert/strict";
import { reviewAwinFeedLocally } from "../feed-review.js";

const now = new Date("2026-11-18T12:00:00.000Z");
const headers = ["product_id", "product_name", "price", "currency", "deep_link", "brand_name", "mpn", "product_gtin", "in_stock", "is_for_sale", "last_updated"];
const csvRow = (id, name, { brand = "Rigwise", mpn = "", gtin = "", inStock = "1" } = {}) => [
  id, name, "99.99", "EUR", "https://shop.example/product/" + id, brand, mpn, gtin, inStock, "1", "2026-11-18T11:30:00Z"
].join(",");
const options = { advertiserId: "12345", retailerName: "Example retailer", catalogProducts: [], now };

test("local Awin review reports exact, ambiguous, unmatched, and rejected rows without making them eligible", () => {
  const input = [
    headers.join(","),
    csvRow("gtin-one", "Matched by GTIN", { gtin: "4006381333931" }),
    csvRow("mpn-one", "Matched by brand and MPN", { mpn: "RIG-42" }),
    csvRow("ambiguous", "Needs duplicate review", { gtin: "4006381333931" }),
    csvRow("no-match", "No catalogue identity")
  ].join("\n");
  const catalogProducts = [
    { id: "gpu-one", identity: { gtin: "4006381333931" } },
    { id: "gpu-two", identity: { gtin: "4006381333931" } },
    { id: "ram-one", identity: { brand: "Rigwise", mpn: "RIG-42" } }
  ];
  const result = reviewAwinFeedLocally(input, { ...options, catalogProducts });

  assert.deepEqual(result.summary, {
    rowsRead: 4,
    imported: 4,
    rejected: 0,
    matched: 1,
    ambiguous: 2,
    unmatched: 1,
    recommendationEligible: 0
  });
  assert.ok(result.rows.every(row => row.offer.recommendation.eligible === false));
  assert.equal(result.rows[1].match.productId, "ram-one");
});

test("local Awin review requires feed identity fields and limits file size", () => {
  assert.throws(() => reviewAwinFeedLocally("feed", { ...options, advertiserId: "name" }), /numeric Awin advertiser ID/);
  assert.throws(() => reviewAwinFeedLocally("feed", { ...options, retailerName: "" }), /retailer label/);
  assert.throws(() => reviewAwinFeedLocally("x".repeat(10 * 1024 * 1024 + 1), options), /10 MB maximum/);
});

