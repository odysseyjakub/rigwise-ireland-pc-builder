export const IRISH_LANDED_COST_RULES = Object.freeze({
  version: "2026-11-20",
  currency: "EUR",
  standardVatRateBasisPoints: 2300,
  standardVatEffectiveFrom: "2026-01-01",
  lowValueEcommerceDuty: {
    effectiveFrom: "2026-07-01",
    maximumIntrinsicValueMinor: 15000,
    perDistinctItemMinor: 300,
    expires: "2028-07-01"
  },
  unionHandlingFee: {
    effectiveFrom: "2026-11-01",
    perDistinctItemMinor: 200
  },
  sources: {
    vat: "https://www.revenue.ie/en/vat/vat-rates/search-vat-rates/current-vat-rates.aspx",
    euPurchases: "https://www.revenue.ie/en/customs/individuals/buying-online-personal/from-eu.aspx",
    imports: "https://www.revenue.ie/en/customs/individuals/buying-online-personal/outside-eu.aspx",
    importVat: "https://www.revenue.ie/en/vat/goods-and-services-to-and-from-abroad/imports/when-is-vat-payable-on-importation.aspx",
    lowValueDuty: "https://www.revenue.ie/en/customs/individuals/relief-low-value-consignments/index.aspx",
    unionHandlingFee: "https://www.revenue.ie/en/customs/individuals/union-handling-fee/index.aspx",
    unionHandlingConsumer: "https://www.revenue.ie/en/customs/individuals/union-handling-fee/what-does-this-mean.aspx"
  }
});

const ADDITIONAL_CHARGE_MODES = new Set([
  "included_in_checkout",
  "additional_at_checkout",
  "additional_on_delivery",
  "absorbed_by_seller",
  "not_applicable",
  "unknown"
]);

function validMinor(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(label + " must be a non-negative safe integer in minor currency units");
  }
}

function validRate(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(label + " must be a non-negative integer in basis points");
  }
}

function dateOnly(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function addVat(amountMinor, rateBasisPoints) {
  const numerator = BigInt(amountMinor) * BigInt(rateBasisPoints);
  return Number((numerator + 5000n) / 10000n);
}

function incomplete(gaps, fields = {}) {
  return {
    status: "incomplete",
    exact: false,
    currency: "EUR",
    consumerTotalMinor: null,
    consumerAdditionalMinor: null,
    gaps: [...new Set(gaps)],
    ...fields
  };
}

/**
 * Calculate the consumer total for a domestic or intra-EU checkout.
 * A net-price quote needs a verified applicable VAT rate; a gross quote does
 * not have VAT added a second time.
 */
export function calculateIrishCheckoutTotal({
  itemsMinor,
  shippingMinor = 0,
  currency = "EUR",
  priceBasis,
  vatRateBasisPoints,
  vatRateVerified = false,
  priceBasisVerified = false,
  vatNotDueVerified = false
}) {
  validMinor(itemsMinor, "itemsMinor");
  validMinor(shippingMinor, "shippingMinor");
  if (currency !== "EUR") {
    return incomplete(["convert the source amount to EUR using a dated, verified exchange rate"], {
      currency,
      checkoutSubtotalMinor: itemsMinor + shippingMinor
    });
  }
  if (priceBasisVerified !== true) return incomplete(["checkout price basis is unverified"]);

  const subtotalMinor = itemsMinor + shippingMinor;
  if (priceBasis === "gross") {
    return {
      status: "exact",
      exact: true,
      currency: "EUR",
      taxBasis: "VAT already included in the verified gross checkout price",
      checkoutSubtotalMinor: subtotalMinor,
      additionalVatMinor: 0,
      consumerAdditionalMinor: 0,
      consumerTotalMinor: subtotalMinor,
      rulesVersion: IRISH_LANDED_COST_RULES.version,
      gaps: []
    };
  }

  if (priceBasis === "net") {
    if (vatRateVerified !== true || !Number.isSafeInteger(vatRateBasisPoints)) {
      return incomplete(["the applicable VAT rate and its evidence are required"], { checkoutSubtotalMinor: subtotalMinor });
    }
    validRate(vatRateBasisPoints, "vatRateBasisPoints");
    const vatMinor = addVat(subtotalMinor, vatRateBasisPoints);
    return {
      status: "exact",
      exact: true,
      currency: "EUR",
      taxBasis: "verified net checkout price",
      checkoutSubtotalMinor: subtotalMinor,
      vatRateBasisPoints,
      additionalVatMinor: vatMinor,
      consumerAdditionalMinor: vatMinor,
      consumerTotalMinor: subtotalMinor + vatMinor,
      rulesVersion: IRISH_LANDED_COST_RULES.version,
      gaps: []
    };
  }

  if (priceBasis === "no_vat") {
    if (vatNotDueVerified !== true) return incomplete(["VAT exclusion is not verified"], { checkoutSubtotalMinor: subtotalMinor });
    return {
      status: "exact",
      exact: true,
      currency: "EUR",
      taxBasis: "verified no-VAT treatment",
      checkoutSubtotalMinor: subtotalMinor,
      additionalVatMinor: 0,
      consumerAdditionalMinor: 0,
      consumerTotalMinor: subtotalMinor,
      rulesVersion: IRISH_LANDED_COST_RULES.version,
      gaps: []
    };
  }

  return incomplete(["VAT-inclusive, VAT-exclusive, or verified no-VAT price treatment is required"], {
    checkoutSubtotalMinor: subtotalMinor
  });
}

function consumerCharge(mode, amountMinor, label, gaps) {
  if (!ADDITIONAL_CHARGE_MODES.has(mode)) {
    gaps.push(label + " collection mode is invalid");
    return null;
  }
  if (mode === "unknown") {
    gaps.push(label + " consumer charge treatment is unknown");
    return null;
  }
  if (mode === "not_applicable") {
    if (amountMinor !== 0) gaps.push(label + " is marked not applicable but has a statutory or observed amount");
    return 0;
  }
  if (mode === "included_in_checkout" || mode === "absorbed_by_seller") return 0;
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    gaps.push(label + " amount is not verified");
    return null;
  }
  return amountMinor;
}

/**
 * Estimate import charges for one verified B2C consignment arriving in Ireland
 * from outside the EU. Amounts are EUR minor units. Each customsLine represents
 * one distinct product/tariff grouping; quantity belongs inside that grouping.
 *
 * The statutory amount and the consumer's payable amount are kept separate.
 * Seller pass-through, checkout inclusion, and carrier fees must be verified.
 */
export function calculateIrishImportCharges(input, options = {}) {
  const rules = options.rules ?? IRISH_LANDED_COST_RULES;
  const entryDate = dateOnly(input?.entryDate);
  const gaps = [];
  if (!entryDate) gaps.push("customs entry date is missing or invalid");
  if (input?.dispatchTerritoryVerified !== true) gaps.push("dispatch customs territory is unverified");
  if (input?.currency !== "EUR") gaps.push("consignment values must be converted to EUR with a verified exchange rate");
  if (input?.checkoutTotalVerified !== true) gaps.push("the observed pre-import checkout total is unverified");
  if (!Number.isSafeInteger(input?.checkoutTotalMinor) || input.checkoutTotalMinor < 0) {
    gaps.push("the pre-import checkout total is missing");
  }

  if (input?.dispatchTerritory === "eu_fiscal") {
    if (gaps.length) return incomplete(gaps, { rulesVersion: rules.version });
    return {
      status: "not_applicable",
      exact: true,
      currency: "EUR",
      consumerTotalMinor: input.checkoutTotalMinor,
      consumerAdditionalMinor: 0,
      customsDutyMinor: 0,
      unionHandlingFeeMinor: 0,
      importVatMinor: null,
      carrierAdministrationFeeMinor: null,
      taxTreatment: "EU fiscal dispatch: no import charge added; seller VAT remains a separate checkout check",
      rulesVersion: rules.version,
      gaps: []
    };
  }
  if (input?.dispatchTerritory === "eu_non_fiscal") {
    gaps.push("EU non-fiscal territory requires separate VAT and customs treatment");
  } else if (input?.dispatchTerritory !== "outside_eu") {
    gaps.push("actual dispatch territory is unknown");
  }
  if (input?.isBusinessToConsumer !== true) {
    gaps.push("this rule set covers consumer e-commerce orders only");
  }
  if (input?.isGift === true) gaps.push("gift consignments require a separate rule set");
  if (input?.intrinsicValueVerified !== true || !Number.isSafeInteger(input?.intrinsicValueMinor) || input.intrinsicValueMinor < 0) {
    gaps.push("verified intrinsic goods value is required");
  }
  if (!Array.isArray(input?.customsLines) || input.customsLines.length === 0) {
    gaps.push("verified tariff-classified consignment lines are required");
  }
  if (input?.customsValuesVerified !== true) gaps.push("customs values, including freight and insurance to the EU border, are unverified");
  if (input?.postImportCostsVerified !== true || !Number.isSafeInteger(input?.postImportCostsMinor) || input.postImportCostsMinor < 0) {
    gaps.push("transport, handling, and insurance after EU entry are unverified");
  }

  const lines = Array.isArray(input?.customsLines) ? input.customsLines : [];
  const keys = new Set();
  let customsValueMinor = 0;
  let additionalImportDutiesMinor = 0;
  for (const [index, line] of lines.entries()) {
    if (!line || typeof line.distinctItemKey !== "string" || !line.distinctItemKey.trim() ||
        typeof line.tariffCode !== "string" || !line.tariffCode.trim()) {
      gaps.push("customs line " + (index + 1) + " needs a distinct item key and tariff code");
      continue;
    }
    if (keys.has(line.distinctItemKey)) {
      gaps.push("customs line " + line.distinctItemKey + " is duplicated instead of grouped");
      continue;
    }
    keys.add(line.distinctItemKey);
    if (line.classificationVerified !== true || line.originVerified !== true) {
      gaps.push("tariff classification and origin are unverified for " + line.distinctItemKey);
    }
    if (!Number.isSafeInteger(line.customsValueMinor) || line.customsValueMinor < 0) {
      gaps.push("customs value is invalid for " + line.distinctItemKey);
    } else {
      customsValueMinor += line.customsValueMinor;
      if (!Number.isSafeInteger(customsValueMinor)) gaps.push("combined customs value exceeds the safe integer range");
    }
    if (line.additionalTaxesVerified !== true || !Number.isSafeInteger(line.additionalTaxesMinor) || line.additionalTaxesMinor < 0) {
      gaps.push("additional or trade-remedy duties are unverified for " + line.distinctItemKey);
    } else {
      additionalImportDutiesMinor += line.additionalTaxesMinor;
      if (!Number.isSafeInteger(additionalImportDutiesMinor)) gaps.push("additional import duties exceed the safe integer range");
    }
  }

  const lowValue = Number.isSafeInteger(input?.intrinsicValueMinor) &&
    input.intrinsicValueMinor <= rules.lowValueEcommerceDuty.maximumIntrinsicValueMinor;
  let customsDutyMinor = 0;
  let lowValueDutyApplies = false;
  if (entryDate && entryDate >= rules.lowValueEcommerceDuty.effectiveFrom && lowValue) {
    if (input?.lowValueDutyTreatment === "applicable") {
      lowValueDutyApplies = true;
      customsDutyMinor = keys.size * rules.lowValueEcommerceDuty.perDistinctItemMinor;
    } else if (input?.lowValueDutyTreatment !== "not_applicable") {
      gaps.push("low-value flat-duty applicability, including any preferential treatment, is unknown");
    }
  } else if (entryDate && entryDate >= rules.lowValueEcommerceDuty.effectiveFrom && !lowValue) {
    for (const line of lines) {
      if (line?.dutyRateVerified !== true || !Number.isSafeInteger(line?.dutyRateBasisPoints) || line.dutyRateBasisPoints < 0) {
        gaps.push("TARIC duty rate is unverified for " + (line?.distinctItemKey || "a customs line"));
        continue;
      }
      if (!Number.isSafeInteger(line?.customsValueMinor) || line.customsValueMinor < 0) continue;
      customsDutyMinor += addVat(line.customsValueMinor, line.dutyRateBasisPoints);
    }
  } else if (entryDate && entryDate < rules.lowValueEcommerceDuty.effectiveFrom && !lowValue) {
    for (const line of lines) {
      if (line?.dutyRateVerified !== true || !Number.isSafeInteger(line?.dutyRateBasisPoints) || line.dutyRateBasisPoints < 0) {
        gaps.push("TARIC duty rate is unverified for " + (line?.distinctItemKey || "a customs line"));
        continue;
      }
      if (!Number.isSafeInteger(line?.customsValueMinor) || line.customsValueMinor < 0) continue;
      customsDutyMinor += addVat(line.customsValueMinor, line.dutyRateBasisPoints);
    }
  }

  const distinctItemCount = keys.size;
  const uhfApplicable = Boolean(
    entryDate && entryDate >= rules.unionHandlingFee.effectiveFrom &&
    input?.dispatchTerritory === "outside_eu" && input?.isBusinessToConsumer === true && input?.isGift !== true
  );
  const unionHandlingFeeMinor = uhfApplicable
    ? distinctItemCount * rules.unionHandlingFee.perDistinctItemMinor
    : 0;

  let importVatMinor = null;
  let importVatBaseMinor = null;
  if (input?.chargeTreatment?.importVat === "additional_on_delivery") {
    if (input?.vatRateVerified !== true) {
      gaps.push("the applicable Irish VAT rate is unverified");
    } else if (!Number.isSafeInteger(input?.vatRateBasisPoints) || input.vatRateBasisPoints < 0) {
      gaps.push("the applicable Irish VAT rate is invalid");
    } else if (input?.postImportCostsVerified === true && Number.isSafeInteger(input?.postImportCostsMinor)) {
      importVatBaseMinor = customsValueMinor + customsDutyMinor + additionalImportDutiesMinor +
        unionHandlingFeeMinor + input.postImportCostsMinor;
      importVatMinor = addVat(importVatBaseMinor, input.vatRateBasisPoints);
    }
  }

  const chargeTreatment = input?.chargeTreatment ?? {};
  const chargeGaps = [];
  const totalCustomsDutiesMinor = customsDutyMinor + additionalImportDutiesMinor;
  if (!Number.isSafeInteger(totalCustomsDutiesMinor)) gaps.push("combined customs duties exceed the safe integer range");
  const customsDutyConsumerMinor = consumerCharge(
    totalCustomsDutiesMinor === 0 ? "not_applicable" : chargeTreatment.customsDuty,
    totalCustomsDutiesMinor,
    "customs duty",
    chargeGaps
  );
  const uhfConsumerMinor = consumerCharge(
    uhfApplicable ? chargeTreatment.unionHandlingFee : "not_applicable",
    unionHandlingFeeMinor,
    "Union Handling Fee",
    chargeGaps
  );
  let importVatConsumerMinor;
  const importVatMode = chargeTreatment.importVat;
  if (importVatMode === "additional_on_delivery") {
    importVatConsumerMinor = importVatMinor;
    if (importVatMinor === null) chargeGaps.push("import VAT could not be calculated");
  } else if (importVatMode === "additional_at_checkout") {
    importVatConsumerMinor = input?.importVatAtCheckoutMinor;
    if (!Number.isSafeInteger(importVatConsumerMinor) || importVatConsumerMinor < 0 ||
        input?.importVatAtCheckoutVerified !== true) {
      importVatConsumerMinor = null;
      chargeGaps.push("import VAT charged at checkout is unverified");
    }
  } else {
    importVatConsumerMinor = consumerCharge(importVatMode, 0, "import VAT", chargeGaps);
  }
  const carrierFeeMinor = input?.carrierAdministrationFeeMinor;
  const carrierFeeConsumerMinor = consumerCharge(
    chargeTreatment.carrierAdministration,
    carrierFeeMinor,
    "carrier administration fee",
    chargeGaps
  );
  gaps.push(...chargeGaps);

  const consumerAdditionalMinor = [
    customsDutyConsumerMinor,
    uhfConsumerMinor,
    importVatConsumerMinor,
    carrierFeeConsumerMinor
  ].every(Number.isSafeInteger)
    ? customsDutyConsumerMinor + uhfConsumerMinor + importVatConsumerMinor + carrierFeeConsumerMinor
    : null;
  if (consumerAdditionalMinor !== null && !Number.isSafeInteger(input.checkoutTotalMinor + consumerAdditionalMinor)) {
    gaps.push("consumer total exceeds the safe integer range");
  }
  const exact = gaps.length === 0 && consumerAdditionalMinor !== null;
  return {
    status: exact ? "exact" : "incomplete",
    exact,
    currency: "EUR",
    checkoutTotalMinor: Number.isSafeInteger(input?.checkoutTotalMinor) ? input.checkoutTotalMinor : null,
    consumerAdditionalMinor: exact ? consumerAdditionalMinor : null,
    consumerTotalMinor: exact ? input.checkoutTotalMinor + consumerAdditionalMinor : null,
    distinctItemCount,
    intrinsicValueMinor: Number.isSafeInteger(input?.intrinsicValueMinor) ? input.intrinsicValueMinor : null,
    customsValueMinor,
    customsDutyMinor: customsDutyMinor + additionalImportDutiesMinor,
    lowValueFlatDutyApplied: lowValueDutyApplies,
    unionHandlingFeeMinor,
    importVatBaseMinor,
    importVatMinor,
    carrierAdministrationFeeMinor: Number.isSafeInteger(carrierFeeMinor) ? carrierFeeMinor : null,
    vatRateBasisPoints: input?.vatRateBasisPoints ?? null,
    rulesVersion: rules.version,
    gaps: [...new Set(gaps)]
  };
}

/**
 * Convert an observed foreign-currency amount to EUR minor units using a
 * dated, explicit rational exchange rate. This function does not fetch rates.
 */
export function convertToEurMinor({
  amountMinor,
  fromCurrency,
  rateNumerator,
  rateDenominator,
  rateObservedAt,
  rateSource,
  now = new Date(),
  maxAgeMs = 24 * 60 * 60 * 1000,
  verified = false
}) {
  validMinor(amountMinor, "amountMinor");
  if (fromCurrency === "EUR") return { status: "exact", amountMinor, currency: "EUR", source: "already-eur" };
  if (!/^[A-Z]{3}$/.test(String(fromCurrency ?? ""))) throw new Error("fromCurrency must be an ISO 4217 code");
  if (verified !== true || !Number.isSafeInteger(rateNumerator) || rateNumerator <= 0 ||
      !Number.isSafeInteger(rateDenominator) || rateDenominator <= 0 || !rateSource) {
    return { status: "incomplete", amountMinor: null, currency: "EUR", reason: "a verified exchange rate is required" };
  }
  const observed = new Date(rateObservedAt);
  const current = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(observed.getTime()) || !Number.isFinite(current.getTime()) ||
      current.getTime() < observed.getTime() || current.getTime() - observed.getTime() > maxAgeMs) {
    return { status: "incomplete", amountMinor: null, currency: "EUR", reason: "the exchange rate is missing, future-dated, or stale" };
  }
  const converted = Number((BigInt(amountMinor) * BigInt(rateNumerator) + BigInt(rateDenominator) / 2n) /
    BigInt(rateDenominator));
  if (!Number.isSafeInteger(converted)) throw new Error("Converted EUR amount exceeds the safe integer range");
  return {
    status: "exact",
    amountMinor: converted,
    currency: "EUR",
    source: rateSource,
    rateObservedAt: observed.toISOString(),
    rateNumerator,
    rateDenominator
  };
}

