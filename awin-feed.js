const REQUIRED_COLUMNS = ["product_id", "product_name", "price", "deep_link"];
const MAX_PRODUCT_ID_LENGTH = 75;

function normalizeHeader(value) {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function countRecordDelimiters(input, delimiter) {
  let quoted = false;
  let count = 0;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === '"') {
      if (quoted && input[index + 1] === '"') {
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && (character === "\n" || character === "\r")) {
      break;
    } else if (!quoted && character === delimiter) {
      count += 1;
    }
  }
  return count;
}

function detectDelimiter(input) {
  const candidates = [",", "\t", ";", "|"];
  return candidates
    .map((delimiter, order) => ({ delimiter, order, count: countRecordDelimiters(input, delimiter) }))
    .sort((left, right) => right.count - left.count || left.order - right.order)[0].delimiter;
}

function parseDelimited(input, delimiter) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  function finishField() {
    row.push(field);
    field = "";
  }

  function finishRow() {
    finishField();
    if (row.some(value => value.trim() !== "")) rows.push(row);
    row = [];
  }

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else if (character === "\r" && input[index + 1] === "\n") {
        field += "\n";
        index += 1;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === delimiter) {
      finishField();
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      finishRow();
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("The feed contains an unclosed quoted field");
  if (field.length > 0 || row.length > 0) finishRow();
  return rows;
}

function parseMoneyMinor(value) {
  const normalized = String(value ?? "").trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const amount = Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  return Number.isSafeInteger(amount) ? amount : null;
}

function parseFlag(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(normalized)) return true;
  if (["0", "false", "no", "n"].includes(normalized)) return false;
  return null;
}

function parseStockStatus(value, columnPresent) {
  if (!columnPresent) return "unknown";
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "" || normalized === "0" || normalized === "false" || normalized === "no") {
    return "out_of_stock";
  }
  return "in_stock";
}

function parseDate(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function safeHttpsUrl(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

function hostMatches(hostname, allowedHosts) {
  const host = hostname.toLowerCase();
  return allowedHosts.some(value => {
    const allowed = String(value).toLowerCase().replace(/^\.+|\.+$/g, "");
    return host === allowed || host.endsWith("." + allowed);
  });
}

function dateWindowStatus(validFrom, validTo, now) {
  const timestamp = now.getTime();
  if (validFrom && Date.parse(validFrom) > timestamp) return "not_yet_valid";
  if (validTo && Date.parse(validTo) < timestamp) return "expired";
  return "active";
}

function rowValue(row, indexes, name) {
  const index = indexes.get(name);
  return index === undefined ? "" : row[index] ?? "";
}

function buildBlockers(offer) {
  const blockers = [
    "publisher_permission_not_confirmed",
    "retailer_identity_unverified",
    "product_identity_not_matched",
    "destination_eligibility_unverified",
    "shipping_rule_unverified",
    "tax_treatment_unverified",
    "final_irish_item_price_unavailable",
    "listing_link_unverified"
  ];
  if (!offer.source.sourceUpdatedAt) blockers.push("source_freshness_unknown");
  if (offer.price.currency !== "EUR") blockers.push("euro_price_unavailable");
  if (offer.availability.stockStatus !== "in_stock" || offer.availability.forSale !== true) {
    blockers.push("in_stock_sale_status_unconfirmed");
  }
  if (offer.validity.status !== "active") blockers.push("offer_outside_validity_window");
  return blockers;
}

/**
 * Parse a licensed Awin publisher CSV export into source observations.
 * This function never fetches a feed, handles credentials, or marks an offer
 * eligible for a purchase recommendation.
 */
export function importAwinCsv(input, options = {}) {
  if (typeof input !== "string" || input.trim() === "") {
    throw new Error("A non-empty Awin CSV feed is required");
  }
  if (!options.advertiserId || !options.retailerId) {
    throw new Error("advertiserId and retailerId are required");
  }

  const text = input.replace(/^\uFEFF/, "");
  const delimiter = options.delimiter ?? detectDelimiter(text);
  const rows = parseDelimited(text, delimiter);
  if (rows.length < 2) throw new Error("The feed needs a header and at least one product row");

  const headers = rows[0].map(normalizeHeader);
  if (headers.some(header => !header)) throw new Error("The feed contains an empty column name");
  if (new Set(headers).size !== headers.length) throw new Error("The feed contains duplicate column names");
  const indexes = new Map(headers.map((header, index) => [header, index]));
  const missing = REQUIRED_COLUMNS.filter(column => !indexes.has(column));
  if (missing.length) throw new Error("The feed is missing required columns: " + missing.join(", "));

  const now = options.now instanceof Date ? options.now : new Date(options.now ?? Date.now());
  if (!Number.isFinite(now.getTime())) throw new Error("now must be a valid date");
  const allowedLinkHosts = Array.isArray(options.allowedLinkHosts) ? options.allowedLinkHosts : [];
  const seenProductIds = new Set();
  const offers = [];
  const rejected = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const line = rowIndex + 1;
    const merchantProductId = String(rowValue(row, indexes, "product_id")).trim();
    const name = String(rowValue(row, indexes, "product_name")).trim();
    const priceMinor = parseMoneyMinor(rowValue(row, indexes, "price"));

    if (!merchantProductId || merchantProductId.length > MAX_PRODUCT_ID_LENGTH || /[\u0000-\u001F\u007F]/.test(merchantProductId)) {
      rejected.push({ line, reason: "invalid_product_id" });
      continue;
    }
    if (seenProductIds.has(merchantProductId)) {
      rejected.push({ line, reason: "duplicate_product_id" });
      continue;
    }
    seenProductIds.add(merchantProductId);
    if (!name) {
      rejected.push({ line, reason: "missing_product_name", merchantProductId });
      continue;
    }
    if (priceMinor === null) {
      rejected.push({ line, reason: "invalid_price", merchantProductId });
      continue;
    }

    const currencyValue = String(rowValue(row, indexes, "currency")).trim().toUpperCase();
    const currency = /^[A-Z]{3}$/.test(currencyValue) ? currencyValue : null;
    const deepLink = safeHttpsUrl(rowValue(row, indexes, "deep_link"));
    if (!deepLink) {
      rejected.push({ line, reason: "invalid_https_deep_link", merchantProductId });
      continue;
    }
    const image = safeHttpsUrl(
      rowValue(row, indexes, "image_url") ||
      rowValue(row, indexes, "large_image") ||
      rowValue(row, indexes, "merchant_thumb")
    );
    const validFromRaw = String(rowValue(row, indexes, "valid_from")).trim();
    const validToRaw = String(rowValue(row, indexes, "valid_to")).trim();
    const validFrom = parseDate(validFromRaw);
    const validTo = parseDate(validToRaw);
    const sourceUpdatedAt = parseDate(rowValue(row, indexes, "last_updated"));
    const stockStatus = parseStockStatus(rowValue(row, indexes, "in_stock"), indexes.has("in_stock"));
    const forSale = indexes.has("is_for_sale") ? parseFlag(rowValue(row, indexes, "is_for_sale")) : null;
    const deliveryCostMinor = parseMoneyMinor(rowValue(row, indexes, "delivery_cost"));
    const linkDomainVerified = allowedLinkHosts.length > 0 && hostMatches(deepLink.hostname, allowedLinkHosts);
    const offer = {
      id: "awin:" + encodeURIComponent(String(options.advertiserId)) + ":" + encodeURIComponent(merchantProductId),
      retailerId: String(options.retailerId),
      source: {
        provider: "awin",
        feedType: "publisher-product-feed",
        advertiserId: String(options.advertiserId),
        importedAt: now.toISOString(),
        sourceUpdatedAt
      },
      product: {
        merchantProductId,
        name,
        description: String(rowValue(row, indexes, "description")).trim() || null,
        brand: String(rowValue(row, indexes, "brand_name")).trim() || null,
        manufacturerPartNumber: String(rowValue(row, indexes, "mpn")).trim() || null,
        modelNumber: String(rowValue(row, indexes, "model_number")).trim() || null,
        gtin: String(
          rowValue(row, indexes, "product_gtin") ||
          rowValue(row, indexes, "ean") ||
          rowValue(row, indexes, "upc")
        ).trim() || null,
        ean: String(rowValue(row, indexes, "ean")).trim() || null,
        upc: String(rowValue(row, indexes, "upc")).trim() || null,
        category: String(rowValue(row, indexes, "merchant_category")).trim() || null,
        imageUrl: image?.href ?? null,
        deepLink: deepLink.href,
        deepLinkHost: deepLink.hostname.toLowerCase(),
        linkDomainVerified,
        condition: String(rowValue(row, indexes, "condition")).trim() || null
      },
      price: {
        amountMinor: priceMinor,
        currency,
        taxTreatment: "unknown"
      },
      availability: {
        stockStatus,
        forSale,
        status: forSale === false ? "not_for_sale" :
          stockStatus === "out_of_stock" ? "out_of_stock" :
          stockStatus === "in_stock" && forSale === true ? "in_stock" : "unknown"
      },
      delivery: {
        feedDeliveryCostMinor: deliveryCostMinor,
        feedDeliveryCostCurrency: currency,
        feedDeliveryCostMeaning: deliveryCostMinor === null ? "not_provided" : "source_field_only",
        deliveryTime: String(rowValue(row, indexes, "delivery_time")).trim() || null,
        restrictions: String(rowValue(row, indexes, "delivery_restrictions")).trim() || null,
        irelandEligibility: "unverified",
        orderShippingRule: "unverified"
      },
      validity: {
        validFrom,
        validTo,
        status: (validFromRaw && !validFrom) || (validToRaw && !validTo)
          ? "invalid"
          : dateWindowStatus(validFrom, validTo, now)
      },
      recommendation: {
        eligible: false,
        blockers: []
      }
    };
    offer.recommendation.blockers = buildBlockers(offer);
    offers.push(offer);
  }

  return {
    provider: "awin",
    advertiserId: String(options.advertiserId),
    retailerId: String(options.retailerId),
    importedAt: now.toISOString(),
    delimiter: delimiter === "\t" ? "tab" : delimiter,
    offers,
    rejected,
    summary: {
      rowsRead: rows.length - 1,
      imported: offers.length,
      rejected: rejected.length,
      recommendationEligible: 0
    }
  };
}

function cleanGtin(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits || null;
}

export function isValidGtin(value) {
  const digits = cleanGtin(value);
  if (!digits || ![8, 12, 13, 14].includes(digits.length)) return false;
  const checkDigit = Number(digits.at(-1));
  const body = digits.slice(0, -1);
  let sum = 0;
  for (let index = body.length - 1, position = 0; index >= 0; index -= 1, position += 1) {
    sum += Number(body[index]) * (position % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10 === checkDigit;
}

function identityOf(product) {
  const identity = product.identity ?? product;
  return {
    gtin: identity.gtin ?? identity.productGTIN ?? identity.product_gtin ?? identity.ean ?? identity.upc ?? null,
    brand: identity.brand ?? identity.brandName ?? product.brand ?? null,
    mpn: identity.mpn ?? identity.manufacturerPartNumber ?? product.mpn ?? null
  };
}

function normalizedKey(value) {
  return String(value ?? "").trim().toUpperCase().replace(/\s+/g, " ");
}

/**
 * Match only on a valid GTIN or an exact brand + manufacturer part number.
 * Name similarity is intentionally not sufficient to merge hardware records.
 */
export function matchAwinProduct(offer, catalogProducts) {
  if (!offer?.product || !Array.isArray(catalogProducts)) {
    throw new Error("An imported offer and a catalogue product array are required");
  }

  const importedGtin = offer.product.gtin ?? offer.product.ean ?? offer.product.upc;
  if (isValidGtin(importedGtin)) {
    const gtinMatches = catalogProducts.filter(product => {
      const identity = identityOf(product);
      const candidate = identity.gtin;
      return isValidGtin(candidate) && cleanGtin(candidate) === cleanGtin(importedGtin);
    });
    if (gtinMatches.length === 1) {
      return { status: "matched", method: "gtin", productId: gtinMatches[0].id };
    }
    if (gtinMatches.length > 1) return { status: "ambiguous", method: "gtin", productIds: gtinMatches.map(item => item.id) };
  }

  const brand = normalizedKey(offer.product.brand);
  const mpn = normalizedKey(offer.product.manufacturerPartNumber);
  if (brand && mpn) {
    const partMatches = catalogProducts.filter(product => {
      const identity = identityOf(product);
      return normalizedKey(identity.brand) === brand && normalizedKey(identity.mpn) === mpn;
    });
    if (partMatches.length === 1) {
      return { status: "matched", method: "brand_mpn", productId: partMatches[0].id };
    }
    if (partMatches.length > 1) return { status: "ambiguous", method: "brand_mpn", productIds: partMatches.map(item => item.id) };
  }

  return { status: "unmatched", method: null, productIds: [] };
}

export function assessAwinOfferReadiness(offer, evidence = {}, options = {}) {
  if (!offer?.source || !offer?.price || !offer?.availability || !offer?.validity) {
    throw new Error("A normalized Awin offer is required");
  }
  const now = options.now instanceof Date ? options.now : new Date(options.now ?? Date.now());
  const maxAgeMs = Number.isFinite(options.maxAgeMs) ? options.maxAgeMs : 24 * 60 * 60 * 1000;
  const updatedAt = offer.source.sourceUpdatedAt ? Date.parse(offer.source.sourceUpdatedAt) : NaN;
  const checks = {
    publisherPermission: evidence.publisherPermission === true,
    retailerIdentityVerified: evidence.retailerIdentityVerified === true,
    exactProductMatch: evidence.productMatchStatus === "matched",
    inStockAndForSale: offer.availability.status === "in_stock",
    euroPrice: offer.price.currency === "EUR",
    finalIrishItemPriceVerified: Number.isSafeInteger(evidence.finalCustomerPriceMinor) &&
      evidence.finalCustomerPriceMinor >= 0 && evidence.finalCustomerCurrency === "EUR" &&
      evidence.taxTreatmentVerified === true,
    freshSourceRecord: Number.isFinite(updatedAt) && now.getTime() - updatedAt <= maxAgeMs && updatedAt <= now.getTime(),
    currentOfferWindow: offer.validity.status === "active",
    irelandDeliveryVerified: evidence.irelandDeliveryVerified === true,
    orderShippingRuleVerified: evidence.orderShippingRuleVerified === true,
    taxTreatmentVerified: evidence.taxTreatmentVerified === true,
    exactListingVerified: evidence.exactListingVerified === true
  };
  const blockers = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
  return { eligible: blockers.length === 0, checks, blockers };
}

/**
 * Convert an imported record to the optimiser's offer shape only after every
 * source, identity, availability, delivery, tax, link, and freshness gate passes.
 */
export function toOptimizerOffer(offer, evidence = {}, options = {}) {
  const readiness = assessAwinOfferReadiness(offer, evidence, options);
  if (!readiness.eligible) {
    throw new Error("Awin offer is not eligible: " + readiness.blockers.join(", "));
  }
  const match = evidence.productMatch;
  if (match?.status !== "matched" || typeof match.productId !== "string" || !match.productId) {
    throw new Error("A unique matched catalogue product id is required");
  }
  if (!Number.isSafeInteger(evidence.finalCustomerPriceMinor) || evidence.finalCustomerPriceMinor < 0 ||
      evidence.finalCustomerCurrency !== "EUR") {
    throw new Error("A verified final customer price in EUR minor units is required");
  }

  return {
    id: offer.id,
    componentId: match.productId,
    retailerId: offer.retailerId,
    price: evidence.finalCustomerPriceMinor / 100,
    available: true,
    evidence: {
      provider: "awin",
      advertiserId: offer.source.advertiserId,
      importedAt: offer.source.importedAt,
      sourceUpdatedAt: offer.source.sourceUpdatedAt,
      productMatchMethod: match.method,
      finalCustomerPriceMinor: evidence.finalCustomerPriceMinor,
      finalCustomerCurrency: evidence.finalCustomerCurrency,
      listingVerified: true,
      irelandDeliveryVerified: true,
      shippingRuleVerified: true,
      taxTreatmentVerified: true
    }
  };
}
