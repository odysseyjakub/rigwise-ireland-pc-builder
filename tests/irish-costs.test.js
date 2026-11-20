import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateIrishCheckoutTotal,
  calculateIrishImportCharges,
  convertToEurMinor,
  IRISH_LANDED_COST_RULES
} from "../irish-costs.js";

function importInput(overrides = {}) {
  return {
    entryDate: "2026-11-17",
    dispatchTerritory: "outside_eu",
    dispatchTerritoryVerified: true,
    isBusinessToConsumer: true,
    isGift: false,
    currency: "EUR",
    checkoutTotalMinor: 2200,
    checkoutTotalVerified: true,
    intrinsicValueMinor: 1500,
    intrinsicValueVerified: true,
    customsValuesVerified: true,
    postImportCostsMinor: 0,
    postImportCostsVerified: true,
    customsLines: [
      {
        distinctItemKey: "widget-a",
        quantity: 1,
        tariffCode: "8471.30",
        classificationVerified: true,
        originVerified: true,
        customsValueMinor: 1500,
        additionalTaxesMinor: 0,
        additionalTaxesVerified: true
      },
      {
        distinctItemKey: "widget-b",
        quantity: 1,
        tariffCode: "8471.30",
        classificationVerified: true,
        originVerified: true,
        customsValueMinor: 700,
        additionalTaxesMinor: 0,
        additionalTaxesVerified: true
      }
    ],
    lowValueDutyTreatment: "applicable",
    vatRateBasisPoints: 2300,
    vatRateVerified: true,
    chargeTreatment: {
      customsDuty: "additional_on_delivery",
      unionHandlingFee: "additional_on_delivery",
      importVat: "additional_on_delivery",
      carrierAdministration: "additional_on_delivery"
    },
    carrierAdministrationFeeMinor: 1000,
    ...overrides
  };
}

test("gross checkout prices are not charged VAT twice", () => {
  const result = calculateIrishCheckoutTotal({
    itemsMinor: 12300,
    shippingMinor: 500,
    priceBasis: "gross",
    priceBasisVerified: true
  });
  assert.equal(result.exact, true);
  assert.equal(result.additionalVatMinor, 0);
  assert.equal(result.consumerTotalMinor, 12800);
});

test("verified net checkout prices add the stated VAT rate", () => {
  const result = calculateIrishCheckoutTotal({
    itemsMinor: 10000,
    priceBasis: "net",
    priceBasisVerified: true,
    vatRateBasisPoints: 2300,
    vatRateVerified: true
  });
  assert.equal(result.additionalVatMinor, 2300);
  assert.equal(result.consumerTotalMinor, 12300);
});

test("no-VAT prices require evidence", () => {
  const unverified = calculateIrishCheckoutTotal({
    itemsMinor: 10000,
    priceBasis: "no_vat",
    priceBasisVerified: true
  });
  assert.equal(unverified.exact, false);
  assert.equal(calculateIrishCheckoutTotal({
    itemsMinor: 10000,
    priceBasis: "no_vat",
    priceBasisVerified: true,
    vatNotDueVerified: true
  }).consumerTotalMinor, 10000);
});

test("Revenue low-value example includes flat duty, UHF, import VAT, and carrier fee", () => {
  const result = calculateIrishImportCharges(importInput());
  assert.equal(result.exact, true, result.gaps.join("; "));
  assert.equal(result.customsDutyMinor, 600);
  assert.equal(result.unionHandlingFeeMinor, 400);
  assert.equal(result.importVatBaseMinor, 3200);
  assert.equal(result.importVatMinor, 736);
  assert.equal(result.consumerAdditionalMinor, 2736);
  assert.equal(result.consumerTotalMinor, 4936);
});

test("Revenue high-value example applies verified tariff rates per distinct product", () => {
  const result = calculateIrishImportCharges(importInput({
    checkoutTotalMinor: 26500,
    intrinsicValueMinor: 25000,
    customsLines: [
      {
        distinctItemKey: "graphics-card",
        quantity: 1,
        tariffCode: "8473.30",
        classificationVerified: true,
        originVerified: true,
        customsValueMinor: 15750,
        dutyRateBasisPoints: 1200,
        dutyRateVerified: true,
        additionalTaxesMinor: 0,
        additionalTaxesVerified: true
      },
      {
        distinctItemKey: "processor",
        quantity: 1,
        tariffCode: "8542.31",
        classificationVerified: true,
        originVerified: true,
        customsValueMinor: 10750,
        dutyRateBasisPoints: 1690,
        dutyRateVerified: true,
        additionalTaxesMinor: 0,
        additionalTaxesVerified: true
      }
    ],
    carrierAdministrationFeeMinor: 1000
  }));
  assert.equal(result.exact, true, result.gaps.join("; "));
  assert.equal(result.customsDutyMinor, 3707);
  assert.equal(result.unionHandlingFeeMinor, 400);
  assert.equal(result.importVatBaseMinor, 30607);
  assert.equal(result.importVatMinor, 7040);
  assert.equal(result.consumerTotalMinor, 38647);
});

test("identical product quantities are represented as one distinct customs line", () => {
  const result = calculateIrishImportCharges(importInput({
    customsLines: [
      {
        distinctItemKey: "same-product",
        quantity: 4,
        tariffCode: "8471.30",
        classificationVerified: true,
        originVerified: true,
        customsValueMinor: 2200,
        additionalTaxesMinor: 0,
        additionalTaxesVerified: true
      }
    ]
  }));
  assert.equal(result.exact, true, result.gaps.join("; "));
  assert.equal(result.distinctItemCount, 1);
  assert.equal(result.customsDutyMinor, 300);
  assert.equal(result.unionHandlingFeeMinor, 200);
});

test("duplicate customs lines and unknown consumer pass-through block an exact total", () => {
  const duplicate = calculateIrishImportCharges(importInput({
    customsLines: [importInput().customsLines[0], importInput().customsLines[0]]
  }));
  assert.equal(duplicate.exact, false);
  assert.ok(duplicate.gaps.some(gap => gap.includes("duplicated")));

  const unknown = calculateIrishImportCharges(importInput({
    chargeTreatment: { ...importInput().chargeTreatment, unionHandlingFee: "unknown" }
  }));
  assert.equal(unknown.consumerTotalMinor, null);
  assert.ok(unknown.gaps.some(gap => gap.includes("Union Handling Fee")));
});

test("a nonzero statutory charge cannot be marked not applicable", () => {
  const result = calculateIrishImportCharges(importInput({
    chargeTreatment: { ...importInput().chargeTreatment, customsDuty: "not_applicable" }
  }));
  assert.equal(result.exact, false);
  assert.ok(result.gaps.some(gap => gap.includes("not applicable")));
});

test("EU fiscal dispatch adds no import duty or Union Handling Fee", () => {
  const result = calculateIrishImportCharges(importInput({ dispatchTerritory: "eu_fiscal" }));
  assert.equal(result.status, "not_applicable");
  assert.equal(result.consumerTotalMinor, 2200);
  assert.equal(result.consumerAdditionalMinor, 0);
  assert.equal(result.unionHandlingFeeMinor, 0);
});

test("July duty and November handling-fee effective dates are applied", () => {
  const beforeDuty = calculateIrishImportCharges(importInput({
    entryDate: "2026-06-30",
    lowValueDutyTreatment: "not_applicable",
    chargeTreatment: { ...importInput().chargeTreatment, customsDuty: "not_applicable", unionHandlingFee: "not_applicable", carrierAdministration: "not_applicable" },
    carrierAdministrationFeeMinor: 0
  }));
  assert.equal(beforeDuty.exact, true, beforeDuty.gaps.join("; "));
  assert.equal(beforeDuty.customsDutyMinor, 0);
  assert.equal(beforeDuty.unionHandlingFeeMinor, 0);

  const july = calculateIrishImportCharges(importInput({
    entryDate: "2026-07-01",
    checkoutTotalMinor: 10000,
    intrinsicValueMinor: 10000,
    customsLines: [{ ...importInput().customsLines[0], customsValueMinor: 10000 }],
    chargeTreatment: { ...importInput().chargeTreatment, unionHandlingFee: "not_applicable", carrierAdministration: "not_applicable" },
    carrierAdministrationFeeMinor: 0
  }));
  assert.equal(july.customsDutyMinor, 300);
  assert.equal(july.unionHandlingFeeMinor, 0);

  const november = calculateIrishImportCharges(importInput({
    entryDate: "2026-11-01",
    checkoutTotalMinor: 10000,
    intrinsicValueMinor: 10000,
    customsLines: [{ ...importInput().customsLines[0], customsValueMinor: 10000 }],
    chargeTreatment: { ...importInput().chargeTreatment, carrierAdministration: "not_applicable" },
    carrierAdministrationFeeMinor: 0
  }));
  assert.equal(november.unionHandlingFeeMinor, 200);
  assert.equal(november.customsDutyMinor, 300);
});

test("foreign currency conversion requires a fresh dated verified rate", () => {
  const args = {
    amountMinor: 1000,
    fromCurrency: "GBP",
    rateNumerator: 118,
    rateDenominator: 100,
    rateObservedAt: "2026-11-17T09:00:00Z",
    rateSource: "verified daily rate",
    now: "2026-11-17T10:00:00Z",
    verified: true
  };
  assert.deepEqual(convertToEurMinor(args).amountMinor, 1180);
  assert.equal(convertToEurMinor({ ...args, now: "2026-11-20T10:00:00Z" }).status, "incomplete");
  assert.equal(convertToEurMinor({ ...args, verified: false }).status, "incomplete");
});

test("rules publish the currently effective version and statutory dates", () => {
  assert.equal(IRISH_LANDED_COST_RULES.version, "2026-11-20");
  assert.equal(IRISH_LANDED_COST_RULES.standardVatRateBasisPoints, 2300);
  assert.equal(IRISH_LANDED_COST_RULES.lowValueEcommerceDuty.effectiveFrom, "2026-07-01");
  assert.equal(IRISH_LANDED_COST_RULES.unionHandlingFee.effectiveFrom, "2026-11-01");
});

