import { isValidGtin, matchAwinProduct } from "./awin-feed.js";

const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function parseMinor(value) {
  const text = typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : String(value ?? "").trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const amount = Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  return Number.isSafeInteger(amount) ? amount : null;
}

function text(value, maxLength = 300) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function safeHttpsUrl(value) {
  const normalized = text(value, 2048);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

function isKelkooTrackedUrl(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return url.protocol === "https:" && !url.username && !url.password &&
      (hostname === "kelkoogroup.net" || hostname.endsWith(".kelkoogroup.net"));
  } catch {
    return false;
  }
}

function asDate(value) {
  const timestamp = Date.parse(value ?? "");
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function validateOptions(options) {
  const now = options.now instanceof Date ? options.now : new Date(options.now ?? Date.now());
  const maxAgeMs = options.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
  if (!Number.isFinite(now.getTime())) throw new Error("now must be a valid date");
  if (!Number.isSafeInteger(maxAgeMs) || maxAgeMs < 0) throw new Error("maxAgeMs must be a non-negative safe integer");
  return { now, maxAgeMs };
}

/**
 * Normalize one documented Kelkoo Shopping API offer into a source observation.
 * The result is never optimizer-eligible without separate checkout evidence.
 */
export function normalizeKelkooOffer(row, options = {}) {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new Error("A Kelkoo offer object is required");
  }
  const { now } = validateOptions(options);
  const code = row.code && typeof row.code === "object" ? row.code : {};
  const brand = row.brand && typeof row.brand === "object" ? row.brand : {};
  const landingUrl = safeHttpsUrl(row.offerUrl?.landingUrl ?? row.offerUrlLandingUrl);
  const trackedUrl = safeHttpsUrl(row.goUrl);
  const priceMinor = parseMinor(row.price);
  const deliveryCostMinor = row.deliveryCost === undefined || row.deliveryCost === null
    ? null
    : parseMinor(row.deliveryCost);
  const totalPriceMinor = row.totalPrice === undefined || row.totalPrice === null
    ? null
    : parseMinor(row.totalPrice);
  const sourceUpdatedAt = asDate(row.lastUpdateDate);
  const sourceCountry = text(row.country, 8)?.toLowerCase() ?? null;
  const sourceCurrency = text(row.currency, 8)?.toUpperCase() ?? null;
  const providerTotalConsistent = priceMinor !== null && deliveryCostMinor !== null && totalPriceMinor !== null
    ? priceMinor + deliveryCostMinor === totalPriceMinor
    : null;
  const availabilityStatus = text(row.availabilityStatus, 40)?.toLowerCase() ?? "unknown";
  const gtin = text(code.gtin ?? row.codeGtin ?? code.ean ?? row.codeEan, 32);
  const mpn = text(code.mpn ?? row.codeMpn, 120);
  const ean = text(code.ean ?? row.codeEan, 32);
  const merchantId = row.merchantId === undefined || row.merchantId === null ? null : String(row.merchantId);
  const offerId = text(row.offerId, 160);

  const observation = {
    id: offerId ? "kelkoo:" + encodeURIComponent(offerId) : null,
    provider: "kelkoo",
    importedAt: now.toISOString(),
    sourceUpdatedAt,
    country: sourceCountry,
    sourceCurrency,
    priceMinor,
    deliveryCostMinor,
    totalPriceMinor,
    providerTotalConsistent,
    availabilityStatus,
    title: text(row.title, 300),
    merchantId,
    merchantName: text(row.merchantName, 160),
    brandName: text(brand.name ?? row.brandName, 120),
    gtin,
    ean,
    mpn,
    landingUrl,
    trackedUrl,
    recommendation: { eligible: false, blockers: [] }
  };

  const { maxAgeMs } = validateOptions(options);
  const updatedAt = sourceUpdatedAt ? Date.parse(sourceUpdatedAt) : Number.NaN;
  const checks = {
    irelandMarket: sourceCountry === "ie",
    euroCurrency: sourceCurrency === "EUR",
    validSourcePrice: Number.isSafeInteger(priceMinor) && priceMinor >= 0,
    knownItemDeliveryCost: Number.isSafeInteger(deliveryCostMinor) && deliveryCostMinor >= 0,
    providerTotalConsistent: providerTotalConsistent !== false,
    inStock: availabilityStatus === "in_stock",
    sourceFresh: Number.isFinite(updatedAt) && updatedAt <= now.getTime() && now.getTime() - updatedAt <= maxAgeMs,
    exactHttpsListing: landingUrl !== null,
    authenticatedTrackedLink: trackedUrl !== null && new URL(trackedUrl).hostname.endsWith(".kelkoogroup.net")
  };
  observation.sourceChecks = checks;
  observation.recommendation.blockers = [
    ...Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name),
    "publisherPermission",
    "retailerIdentityVerified",
    "exactCatalogueMatch",
    "finalCustomerPriceInEur",
    "irelandDeliveryVerified",
    "orderShippingRuleVerified",
    "taxTreatmentVerified"
  ];
  return observation;
}

/**
 * Normalize an API response's offers array. Provider examples are source
 * observations only and must not be treated as live offers without a request.
 */
export function normalizeKelkooResponse(payload, options = {}) {
  if (!payload || !Array.isArray(payload.offers)) {
    throw new Error("A Kelkoo API response with an offers array is required");
  }
  return {
    provider: "kelkoo",
    importedAt: (options.now instanceof Date ? options.now : new Date(options.now ?? Date.now())).toISOString(),
    offers: payload.offers.map(offer => normalizeKelkooOffer(offer, options))
  };
}

export function matchKelkooProduct(observation, catalogProducts) {
  if (!observation || observation.provider !== "kelkoo") {
    throw new Error("A normalized Kelkoo observation is required");
  }
  return matchAwinProduct({
    product: {
      gtin: isValidGtin(observation.gtin) ? observation.gtin : null,
      ean: isValidGtin(observation.ean) ? observation.ean : null,
      brand: observation.brandName,
      manufacturerPartNumber: observation.mpn
    }
  }, catalogProducts);
}

export function assessKelkooOfferReadiness(observation, evidence = {}, options = {}) {
  if (!observation || observation.provider !== "kelkoo") {
    throw new Error("A normalized Kelkoo observation is required");
  }
  const { now, maxAgeMs } = validateOptions(options);
  const updatedAt = observation.sourceUpdatedAt ? Date.parse(observation.sourceUpdatedAt) : Number.NaN;
  const productMatch = evidence.productMatch;
  const checks = {
    providerOfferIdPresent: typeof observation.id === "string" && observation.id.startsWith("kelkoo:") && observation.id.length > 7,
    sourceMerchantIdPresent: typeof observation.merchantId === "string" && observation.merchantId.length > 0,
    irelandMarket: observation.country === "ie",
    sourceCurrencyEuro: observation.sourceCurrency === "EUR",
    validSourcePrice: Number.isSafeInteger(observation.priceMinor) && observation.priceMinor >= 0,
    explicitDeliveryCost: Number.isSafeInteger(observation.deliveryCostMinor) && observation.deliveryCostMinor >= 0,
    providerTotalConsistent: observation.providerTotalConsistent !== false,
    inStock: observation.availabilityStatus === "in_stock",
    freshSourceRecord: Number.isFinite(updatedAt) && updatedAt <= now.getTime() && now.getTime() - updatedAt <= maxAgeMs,
    exactHttpsListing: observation.landingUrl !== null && evidence.exactListingVerified === true,
    authenticatedTrackedLink: isKelkooTrackedUrl(observation.trackedUrl),
    publisherPermission: evidence.publisherPermission === true,
    retailerIdentityVerified: evidence.retailerIdentityVerified === true && typeof evidence.retailerId === "string" && evidence.retailerId.length > 0,
    exactCatalogueMatch: productMatch?.status === "matched" && typeof productMatch.productId === "string" && productMatch.productId.length > 0,
    finalCustomerPriceInEur: Number.isSafeInteger(evidence.finalCustomerPriceMinor) && evidence.finalCustomerPriceMinor >= 0 && evidence.finalCustomerCurrency === "EUR",
    irelandDeliveryVerified: evidence.irelandDeliveryVerified === true,
    orderShippingRuleVerified: evidence.orderShippingRuleVerified === true,
    taxTreatmentVerified: evidence.taxTreatmentVerified === true
  };
  const blockers = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
  return { eligible: blockers.length === 0, checks, blockers };
}

/** Convert a fully evidenced observation to the optimizer's standard offer shape. */
export function toKelkooOptimizerOffer(observation, evidence = {}, options = {}) {
  const readiness = assessKelkooOfferReadiness(observation, evidence, options);
  if (!readiness.eligible) throw new Error("Kelkoo offer is not eligible: " + readiness.blockers.join(", "));
  const productMatch = evidence.productMatch;
  return {
    id: observation.id,
    componentId: productMatch.productId,
    retailerId: evidence.retailerId,
    price: evidence.finalCustomerPriceMinor / 100,
    available: true,
    productUrl: observation.landingUrl,
    trackedUrl: observation.trackedUrl,
    evidence: {
      provider: "kelkoo",
      sourceUpdatedAt: observation.sourceUpdatedAt,
      market: observation.country,
      merchantName: observation.merchantName,
      productMatchMethod: productMatch.method,
      finalCustomerPriceMinor: evidence.finalCustomerPriceMinor,
      finalCustomerCurrency: evidence.finalCustomerCurrency,
      listingVerified: true,
      irelandDeliveryVerified: true,
      shippingRuleVerified: true,
      taxTreatmentVerified: true
    }
  };
}
