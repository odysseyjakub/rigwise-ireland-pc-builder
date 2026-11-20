import test from "node:test";
import assert from "node:assert/strict";
import {
  assessKelkooOfferReadiness,
  matchKelkooProduct,
  normalizeKelkooOffer,
  normalizeKelkooResponse,
  toKelkooOptimizerOffer
} from "../kelkoo-feed.js";

const now = new Date("2026-11-20T12:00:00.000Z");

function row(overrides = {}) {
  return {
    offerId: "kelkoo-offer-1",
    country: "ie",
    lastUpdateDate: "2026-11-20T11:30:00Z",
    title: "Example 1 TB NVMe SSD",
    price: 99.95,
    currency: "EUR",
    deliveryCost: 4.99,
    totalPrice: 104.94,
    availabilityStatus: "in_stock",
    code: { gtin: "4006381333931", ean: "4006381333931", mpn: "SSD-1TB-EX" },
    brand: { name: "Example" },
    merchantId: 42,
    merchantName: "Example Ireland",
    offerUrl: { landingUrl: "https://shop.example.ie/ssd-1tb" },
    goUrl: "https://ie-go.kelkoogroup.net/go?offerId=kelkoo-offer-1",
    ...overrides
  };
}

test("normalizes a documented Kelkoo offer without promoting it to a live recommendation", () => {
  const offer = normalizeKelkooOffer(row(), { now });
  assert.equal(offer.id, "kelkoo:kelkoo-offer-1");
  assert.equal(offer.provider, "kelkoo");
  assert.equal(offer.country, "ie");
  assert.equal(offer.priceMinor, 9995);
  assert.equal(offer.deliveryCostMinor, 499);
  assert.equal(offer.totalPriceMinor, 10494);
  assert.equal(offer.providerTotalConsistent, true);
  assert.equal(offer.availabilityStatus, "in_stock");
  assert.equal(offer.recommendation.eligible, false);
  assert.ok(offer.recommendation.blockers.length > 0);
});

test("normalizes an API response but keeps its observations ineligible", () => {
  const result = normalizeKelkooResponse({ offers: [row(), row({ offerId: "other" })] }, { now });
  assert.equal(result.provider, "kelkoo");
  assert.equal(result.offers.length, 2);
  assert.ok(result.offers.every(offer => offer.recommendation.eligible === false));
  assert.throws(() => normalizeKelkooResponse({ results: [] }, { now }), /offers array/);
});

test("does not infer euro currency from a symbol, and does not infer free delivery from a missing field", () => {
  const offer = normalizeKelkooOffer(row({ currency: "€", deliveryCost: undefined, totalPrice: undefined }), { now });
  assert.equal(offer.sourceCurrency, "€");
  assert.equal(offer.priceMinor, 9995);
  assert.equal(offer.deliveryCostMinor, null);
  assert.equal(offer.sourceChecks.euroCurrency, false);
  assert.equal(offer.sourceChecks.knownItemDeliveryCost, false);
});

test("detects provider total arithmetic conflicts and unsafe listing links", () => {
  const badTotal = normalizeKelkooOffer(row({ totalPrice: 100.01 }), { now });
  const unsafeLink = normalizeKelkooOffer(row({ offerUrl: { landingUrl: "javascript:alert(1)" } }), { now });
  assert.equal(badTotal.providerTotalConsistent, false);
  assert.equal(badTotal.sourceChecks.providerTotalConsistent, false);
  assert.equal(unsafeLink.landingUrl, null);
  assert.equal(unsafeLink.sourceChecks.exactHttpsListing, false);
});

test("matches only exact GTIN or brand and manufacturer part number", () => {
  const offer = normalizeKelkooOffer(row(), { now });
  assert.deepEqual(matchKelkooProduct(offer, [
    { id: "ssd-real", identity: { gtin: "4006381333931" } }
  ]), { status: "matched", method: "gtin", productId: "ssd-real" });
  assert.deepEqual(matchKelkooProduct(offer, [
    { id: "ssd-other", identity: { gtin: "4006381333931" } },
    { id: "ssd-duplicate", identity: { gtin: "4006381333931" } }
  ]), { status: "ambiguous", method: "gtin", productIds: ["ssd-other", "ssd-duplicate"] });
  assert.deepEqual(matchKelkooProduct(normalizeKelkooOffer(row({ code: { mpn: "SSD-1TB-EX" }, brand: { name: "Example" } }), { now }), [
    { id: "ssd-by-mpn", identity: { brand: "Example", mpn: "SSD-1TB-EX" } }
  ]), { status: "matched", method: "brand_mpn", productId: "ssd-by-mpn" });
});

test("freshness, country, stock, currency and offer links must all pass the source gate", () => {
  const stale = normalizeKelkooOffer(row({ lastUpdateDate: "2026-11-18T00:00:00Z" }), { now });
  const future = normalizeKelkooOffer(row({ lastUpdateDate: "2026-11-21T00:00:00Z" }), { now });
  const wrongMarket = normalizeKelkooOffer(row({ country: "uk" }), { now });
  const backOrder = normalizeKelkooOffer(row({ availabilityStatus: "stock_on_order" }), { now });
  for (const [offer, blocker] of [[stale, "sourceFresh"], [future, "sourceFresh"], [wrongMarket, "irelandMarket"], [backOrder, "inStock"]]) {
    assert.equal(offer.sourceChecks[blocker], false);
  }
});

test("a Kelkoo record needs independent publisher, identity, Irish checkout and tax evidence", () => {
  const offer = normalizeKelkooOffer(row(), { now });
  const productMatch = { status: "matched", method: "gtin", productId: "ssd-1tb" };
  const evidence = {
    publisherPermission: true,
    retailerIdentityVerified: true,
    retailerId: "example-ie",
    productMatch,
    exactListingVerified: true,
    finalCustomerPriceMinor: 9995,
    finalCustomerCurrency: "EUR",
    irelandDeliveryVerified: true,
    orderShippingRuleVerified: true,
    taxTreatmentVerified: true
  };
  assert.equal(assessKelkooOfferReadiness(offer, evidence, { now }).eligible, true);
  assert.equal(assessKelkooOfferReadiness(offer, { ...evidence, orderShippingRuleVerified: false }, { now }).eligible, false);
  assert.throws(() => toKelkooOptimizerOffer(offer, {}, { now }), /not eligible/);
  const optimized = toKelkooOptimizerOffer(offer, evidence, { now });
  assert.equal(optimized.componentId, "ssd-1tb");
  assert.equal(optimized.retailerId, "example-ie");
  assert.equal(optimized.price, 99.95);
  assert.equal(optimized.available, true);
  assert.equal(optimized.evidence.provider, "kelkoo");
});
