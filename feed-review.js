import { importAwinCsv, matchAwinProduct } from "./awin-feed.js";

export const MAX_AWIN_REVIEW_BYTES = 10 * 1024 * 1024;

export function reviewAwinFeedLocally(input, { advertiserId, retailerName, catalogProducts, now } = {}) {
  const normalizedAdvertiserId = String(advertiserId ?? "").trim();
  const normalizedRetailerName = String(retailerName ?? "").trim();
  if (!/^\d{1,10}$/.test(normalizedAdvertiserId)) throw new Error("Enter the numeric Awin advertiser ID shown in your publisher account.");
  if (!normalizedRetailerName || normalizedRetailerName.length > 100) throw new Error("Enter a retailer label up to 100 characters long.");
  if (!Array.isArray(catalogProducts)) throw new Error("A product catalogue is required to check exact matches.");
  if (typeof input !== "string" || new TextEncoder().encode(input).length > MAX_AWIN_REVIEW_BYTES) {
    throw new Error("The feed is too large for a local review (10 MB maximum).");
  }

  const imported = importAwinCsv(input, {
    advertiserId: normalizedAdvertiserId,
    retailerId: "local-feed-review",
    now
  });
  const rows = imported.offers.map(offer => ({ offer, match: matchAwinProduct(offer, catalogProducts) }));
  const matchCounts = { matched: 0, ambiguous: 0, unmatched: 0 };
  for (const row of rows) matchCounts[row.match.status] += 1;

  return {
    retailerName: normalizedRetailerName,
    advertiserId: normalizedAdvertiserId,
    rows,
    rejected: imported.rejected,
    summary: {
      ...imported.summary,
      ...matchCounts,
      recommendationEligible: 0
    }
  };
}

