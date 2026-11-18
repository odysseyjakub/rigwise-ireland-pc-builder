import test from "node:test";
import assert from "node:assert/strict";
import {
  assessAwinOfferReadiness,
  importAwinCsv,
  isValidGtin,
  matchAwinProduct,
  toOptimizerOffer
} from "../awin-feed.js";

const now = new Date("2026-11-17T12:00:00.000Z");
const options = {
  advertiserId: "74722",
  retailerId: "buyitdirect-ie",
  allowedLinkHosts: ["buyitdirect.ie", "awin1.com"],
  now
};

function feedRow(overrides = {}) {
  return {
    product_id: "bid-123",
    product_name: "Example GPU, 12 GB",
    price: "499.95",
    deep_link: "https://www.buyitdirect.ie/product/123",
    image_url: "https://images.buyitdirect.ie/123.jpg",
    description: "",
    currency: "EUR",
    brand_name: "Example",
    mpn: "GPU-12-ABC",
    ean: "4006381333931",
    in_stock: "1",
    is_for_sale: "1",
    delivery_cost: "6.99",
    delivery_time: "2-4 days",
    delivery_restrictions: "",
    last_updated: "2026-11-17T10:00:00Z",
    valid_from: "2026-11-01T00:00:00Z",
    valid_to: "2026-12-01T23:59:59Z",
    ...overrides
  };
}

function csv(headers, rows, delimiter = ",") {
  const quote = value => {
    const text = String(value ?? "");
    return /["\r\n,;\t|]/.test(text)
      ? '"' + text.replace(/"/g, '""') + '"'
      : text;
  };
  return [
    headers.map(quote).join(delimiter),
    ...rows.map(row => headers.map(name => quote(row[name])).join(delimiter))
  ].join("\r\n");
}

const columns = Object.keys(feedRow());

test("imports a source observation without promoting it to a live recommendation", () => {
  const result = importAwinCsv("\uFEFF" + csv(columns, [feedRow()]), options);
  const offer = result.offers[0];

  assert.equal(result.delimiter, ",");
  assert.deepEqual(result.summary, { rowsRead: 1, imported: 1, rejected: 0, recommendationEligible: 0 });
  assert.equal(offer.id, "awin:74722:bid-123");
  assert.equal(offer.price.amountMinor, 49995);
  assert.equal(offer.price.currency, "EUR");
  assert.equal(offer.price.taxTreatment, "unknown");
  assert.equal(offer.availability.status, "in_stock");
  assert.equal(offer.delivery.feedDeliveryCostMinor, 699);
  assert.equal(offer.delivery.orderShippingRule, "unverified");
  assert.equal(offer.delivery.irelandEligibility, "unverified");
  assert.equal(offer.product.linkDomainVerified, true);
  assert.equal(offer.recommendation.eligible, false);
  assert.ok(offer.recommendation.blockers.includes("tax_treatment_unverified"));
});

test("quoted commas, doubled quotes, and embedded newlines are parsed as field data", () => {
  const row = feedRow({
    product_name: 'GPU, "quiet edition"',
    description: "First line\nSecond line, with detail"
  });
  const offer = importAwinCsv(csv(columns, [row]), options).offers[0];
  assert.equal(offer.product.name, 'GPU, "quiet edition"');
  assert.equal(offer.product.description, "First line\nSecond line, with detail");
});

test("detects a tab-delimited Awin export", () => {
  const result = importAwinCsv(csv(columns, [feedRow()], "\t"), options);
  assert.equal(result.delimiter, "tab");
  assert.equal(result.offers.length, 1);
});

test("detects pipe-delimited feeds and preserves Awin product_GTIN for exact matching", () => {
  const headers = columns.map(name => name === "ean" ? "product_GTIN" : name);
  const row = { ...feedRow(), product_GTIN: "04006381333931", product_name: "Example GPU | 12 GB" };
  delete row.ean;
  const result = importAwinCsv(csv(headers, [row], "|"), options);
  const offer = result.offers[0];

  assert.equal(result.delimiter, "|");
  assert.equal(offer.product.name, "Example GPU | 12 GB");
  assert.equal(offer.product.gtin, "04006381333931");
  assert.deepEqual(matchAwinProduct(offer, [
    { id: "gpu-exact", identity: { productGTIN: "04006381333931" } }
  ]), { status: "matched", method: "gtin", productId: "gpu-exact" });
});

test("requires source and retailer identities and the core feed columns", () => {
  assert.throws(() => importAwinCsv(csv(columns, [feedRow()]), { now }), /advertiserId and retailerId/);
  assert.throws(() => importAwinCsv("product_id,price\n1,2", options), /missing required columns/);
  assert.throws(() => importAwinCsv("", options), /non-empty Awin CSV/);
});

test("rejects unsafe links, invalid prices, missing names, and duplicate product ids", () => {
  const result = importAwinCsv(csv(columns, [
    feedRow({ product_id: "bad-link", deep_link: "javascript:alert(1)" }),
    feedRow({ product_id: "bad-price", price: "€4,99" }),
    feedRow({ product_id: "no-name", product_name: " " }),
    feedRow({ product_id: "bid-123" }),
    feedRow({ product_id: "bid-123" })
  ]), options);
  assert.equal(result.offers.length, 1);
  assert.deepEqual(result.rejected.map(item => item.reason), [
    "invalid_https_deep_link",
    "invalid_price",
    "missing_product_name",
    "duplicate_product_id"
  ]);
});

test("unknown, out-of-stock, and in-stock states follow the feed field semantics", () => {
  const noStockColumn = importAwinCsv(csv(
    columns.filter(name => name !== "in_stock"),
    [feedRow()]
  ), options).offers[0];
  const blank = importAwinCsv(csv(columns, [feedRow({ in_stock: "" })]), options).offers[0];
  const zero = importAwinCsv(csv(columns, [feedRow({ in_stock: "0" })]), options).offers[0];
  const nonEmpty = importAwinCsv(csv(columns, [feedRow({ in_stock: "available" })]), options).offers[0];

  assert.equal(noStockColumn.availability.stockStatus, "unknown");
  assert.equal(blank.availability.stockStatus, "out_of_stock");
  assert.equal(zero.availability.stockStatus, "out_of_stock");
  assert.equal(nonEmpty.availability.stockStatus, "in_stock");
});

test("sale status and validity windows are explicit", () => {
  const notForSale = importAwinCsv(csv(columns, [feedRow({ is_for_sale: "0" })]), options).offers[0];
  const future = importAwinCsv(csv(columns, [feedRow({ valid_from: "2026-12-01" })]), options).offers[0];
  const expired = importAwinCsv(csv(columns, [feedRow({ valid_to: "2026-11-01" })]), options).offers[0];

  assert.equal(notForSale.availability.status, "not_for_sale");
  assert.equal(future.validity.status, "not_yet_valid");
  assert.equal(expired.validity.status, "expired");
});

test("invalid optional delivery amounts remain unknown and are never treated as free", () => {
  const offer = importAwinCsv(csv(columns, [feedRow({ delivery_cost: "varies" })]), options).offers[0];
  assert.equal(offer.delivery.feedDeliveryCostMinor, null);
  assert.equal(offer.delivery.feedDeliveryCostMeaning, "not_provided");
  assert.ok(offer.recommendation.blockers.includes("shipping_rule_unverified"));
});

test("requires a valid GTIN before using it for an exact catalogue match", () => {
  assert.equal(isValidGtin("4006381333931"), true);
  assert.equal(isValidGtin("4006381333932"), false);
  assert.equal(isValidGtin("not-a-gtin"), false);
});

test("matches exact GTINs and exact brand/MPN pairs only", () => {
  const offer = importAwinCsv(csv(columns, [feedRow()]), options).offers[0];
  const byGtin = matchAwinProduct(offer, [
    { id: "gpu-one", identity: { ean: "4006381333931", brand: "Other", mpn: "Different" } }
  ]);
  const byMpn = matchAwinProduct({ ...offer, product: { ...offer.product, ean: null } }, [
    { id: "gpu-two", identity: { brand: "Example", mpn: "GPU-12-ABC" } }
  ]);
  const fuzzyOnly = matchAwinProduct({ ...offer, product: { ...offer.product, ean: null, manufacturerPartNumber: null } }, [
    { id: "gpu-three", name: "Example GPU, 12 GB" }
  ]);

  assert.deepEqual(byGtin, { status: "matched", method: "gtin", productId: "gpu-one" });
  assert.deepEqual(byMpn, { status: "matched", method: "brand_mpn", productId: "gpu-two" });
  assert.deepEqual(fuzzyOnly, { status: "unmatched", method: null, productIds: [] });
});

test("ambiguous exact identifiers remain for review rather than merging records", () => {
  const offer = importAwinCsv(csv(columns, [feedRow()]), options).offers[0];
  const match = matchAwinProduct(offer, [
    { id: "gpu-one", identity: { ean: "4006381333931" } },
    { id: "gpu-two", identity: { ean: "4006381333931" } }
  ]);
  assert.deepEqual(match, { status: "ambiguous", method: "gtin", productIds: ["gpu-one", "gpu-two"] });
});

test("all external evidence is required before an offer can enter cheapest-price results", () => {
  const offer = importAwinCsv(csv(columns, [feedRow()]), options).offers[0];
  assert.equal(assessAwinOfferReadiness(offer, {}, { now }).eligible, false);
  const ready = assessAwinOfferReadiness(offer, {
    publisherPermission: true,
    retailerIdentityVerified: true,
    productMatchStatus: "matched",
    finalCustomerPriceMinor: 49995,
    finalCustomerCurrency: "EUR",
    irelandDeliveryVerified: true,
    orderShippingRuleVerified: true,
    taxTreatmentVerified: true,
    exactListingVerified: true
  }, { now });
  assert.deepEqual(ready.blockers, []);
  assert.equal(ready.eligible, true);
});

test("only a fully verified and exact-matched observation converts to an optimiser offer", () => {
  const offer = importAwinCsv(csv(columns, [feedRow()]), options).offers[0];
  const productMatch = { status: "matched", method: "gtin", productId: "gpu-12gb" };
  const evidence = {
    publisherPermission: true,
    retailerIdentityVerified: true,
    productMatchStatus: productMatch.status,
    productMatch,
    finalCustomerPriceMinor: 49995,
    finalCustomerCurrency: "EUR",
    irelandDeliveryVerified: true,
    orderShippingRuleVerified: true,
    taxTreatmentVerified: true,
    exactListingVerified: true
  };
  assert.throws(() => toOptimizerOffer(offer, {}, { now }), /not eligible/);
  const optimizerOffer = toOptimizerOffer(offer, evidence, { now });
  assert.equal(optimizerOffer.available, true);
  assert.equal(optimizerOffer.componentId, "gpu-12gb");
  assert.equal(optimizerOffer.price, 499.95);
  assert.equal(optimizerOffer.evidence.finalCustomerPriceMinor, 49995);
  assert.equal(optimizerOffer.evidence.provider, "awin");
});

test("a readiness flag alone cannot convert a feed row without the matched catalogue id", () => {
  const offer = importAwinCsv(csv(columns, [feedRow()]), options).offers[0];
  const evidence = {
    publisherPermission: true,
    retailerIdentityVerified: true,
    productMatchStatus: "matched",
    finalCustomerPriceMinor: 49995,
    finalCustomerCurrency: "EUR",
    irelandDeliveryVerified: true,
    orderShippingRuleVerified: true,
    taxTreatmentVerified: true,
    exactListingVerified: true
  };
  assert.throws(() => toOptimizerOffer(offer, evidence, { now }), /matched catalogue product id/);
});

test("stale and future-dated source observations cannot pass the freshness gate", () => {
  const stale = importAwinCsv(csv(columns, [feedRow({ last_updated: "2026-11-15T00:00:00Z" })]), options).offers[0];
  const future = importAwinCsv(csv(columns, [feedRow({ last_updated: "2026-11-18T00:00:00Z" })]), options).offers[0];
  const evidence = {
    publisherPermission: true,
    retailerIdentityVerified: true,
    productMatchStatus: "matched",
    irelandDeliveryVerified: true,
    orderShippingRuleVerified: true,
    taxTreatmentVerified: true,
    exactListingVerified: true
  };
  assert.ok(assessAwinOfferReadiness(stale, evidence, { now, maxAgeMs: 24 * 60 * 60 * 1000 }).blockers.includes("freshSourceRecord"));
  assert.ok(assessAwinOfferReadiness(future, evidence, { now }).blockers.includes("freshSourceRecord"));
});

test("offers in another currency cannot enter the Irish EUR result set without conversion support", () => {
  const offer = importAwinCsv(csv(columns, [feedRow({ currency: "GBP" })]), options).offers[0];
  assert.equal(offer.price.currency, "GBP");
  const readiness = assessAwinOfferReadiness(offer, {}, { now });
  assert.ok(readiness.blockers.includes("euroPrice"));
});
