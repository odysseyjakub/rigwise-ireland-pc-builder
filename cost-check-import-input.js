import { parseMinorAmount, parseRateBasisPoints } from "./cost-check-input.js";

function optionalAmount(value, label) {
  return String(value ?? "").trim() ? parseMinorAmount(value, label) : null;
}

function optionalRate(value) {
  return String(value ?? "").trim() ? parseRateBasisPoints(value) : undefined;
}

/** Convert explicitly entered browser form evidence into the tax engine schema. */
export function parseIrishImportFields(fields, lineFields = []) {
  const outsideEu = fields.dispatchTerritory === "outside_eu";
  const customsLines = outsideEu ? lineFields.map((line, index) => {
    const quantityText = String(line.quantity ?? "").trim();
    const quantity = quantityText ? Number(quantityText) : 1;
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      throw new Error("Customs line " + (index + 1) + " quantity must be a positive whole number.");
    }
    return {
      distinctItemKey: String(line.distinctItemKey ?? "").trim(),
      quantity,
      tariffCode: String(line.tariffCode ?? "").trim(),
      classificationVerified: line.classificationVerified === true,
      originVerified: line.originVerified === true,
      customsValueMinor: optionalAmount(line.customsValue, "Customs value for line " + (index + 1)),
      dutyRateBasisPoints: optionalRate(line.dutyRate),
      dutyRateVerified: line.dutyRateVerified === true,
      additionalTaxesMinor: optionalAmount(line.additionalTaxes, "Additional duties for line " + (index + 1)),
      additionalTaxesVerified: line.additionalTaxesVerified === true
    };
  }) : [];

  return {
    entryDate: String(fields.entryDate ?? ""),
    dispatchTerritory: String(fields.dispatchTerritory ?? ""),
    dispatchTerritoryVerified: fields.dispatchTerritoryVerified === true,
    isBusinessToConsumer: fields.isBusinessToConsumer === true,
    isGift: fields.isGift === true,
    currency: "EUR",
    checkoutTotalMinor: optionalAmount(fields.checkoutTotal, "Observed seller checkout total"),
    checkoutTotalVerified: fields.checkoutTotalVerified === true,
    intrinsicValueMinor: outsideEu ? optionalAmount(fields.intrinsicValue, "Intrinsic goods value") : null,
    intrinsicValueVerified: outsideEu && fields.intrinsicValueVerified === true,
    customsLines,
    customsValuesVerified: outsideEu && fields.customsValuesVerified === true,
    postImportCostsMinor: outsideEu ? optionalAmount(fields.postImportCosts, "Post-import delivery and handling") : null,
    postImportCostsVerified: outsideEu && fields.postImportCostsVerified === true,
    lowValueDutyTreatment: String(fields.lowValueDutyTreatment ?? ""),
    vatRateBasisPoints: outsideEu ? optionalRate(fields.vatRate) : undefined,
    vatRateVerified: outsideEu && fields.vatRateVerified === true,
    importVatAtCheckoutMinor: outsideEu ? optionalAmount(fields.importVatAtCheckout, "Import VAT paid at checkout") : null,
    importVatAtCheckoutVerified: outsideEu && fields.importVatAtCheckoutVerified === true,
    carrierAdministrationFeeMinor: outsideEu ? optionalAmount(fields.carrierAdministrationFee, "Carrier administration fee") : null,
    chargeTreatment: {
      customsDuty: String(fields.customsDutyTreatment ?? "unknown"),
      unionHandlingFee: String(fields.unionHandlingFeeTreatment ?? "unknown"),
      importVat: String(fields.importVatTreatment ?? "unknown"),
      carrierAdministration: String(fields.carrierAdministrationTreatment ?? "unknown")
    }
  };
}

