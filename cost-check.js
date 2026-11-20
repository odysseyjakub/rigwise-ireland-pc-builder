import { calculateIrishCheckoutTotal, calculateIrishImportCharges, IRISH_LANDED_COST_RULES } from "./irish-costs.js";
import { parseMinorAmount, parseRateBasisPoints } from "./cost-check-input.js";
import { parseIrishImportFields } from "./cost-check-import-input.js";

const $ = selector => document.querySelector(selector);
const form = $("#cost-check-form");
const resultPanel = $("#cost-result");

function money(minor, currency = "EUR") {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(minor / 100);
}

function addDetail(label, value, host = $("#cost-result-details")) {
  const row = document.createElement("div");
  row.className = "cost-result-row";
  const term = document.createElement("span");
  term.textContent = label;
  const detail = document.createElement("strong");
  detail.textContent = value;
  row.append(term, detail);
  host.append(row);
}

function showResult({ state, title, summary, details = [] }) {
  resultPanel.dataset.state = state;
  $("#cost-result-title").textContent = title;
  $("#cost-result-summary").textContent = summary;
  $("#cost-result-details").replaceChildren();
  for (const [label, value] of details) addDetail(label, value);
}

function syncBasisFields() {
  const basis = $("#cost-price-basis").value;
  $("#vat-rate-field").hidden = basis !== "net";
  $("#no-vat-evidence").hidden = basis !== "no_vat";
}

function syncCurrency() {
  const symbol = { EUR: "€", GBP: "£", USD: "$" }[$("#cost-currency").value] || $("#cost-currency").value;
  $("#currency-prefix").textContent = symbol;
  $("#shipping-currency-prefix").textContent = symbol;
  $("#other-currency-prefix").textContent = symbol;
}

function importLineRow(values = {}) {
  const row = $("#import-customs-line-template").content.firstElementChild.cloneNode(true);
  for (const field of row.querySelectorAll("[data-field]")) {
    const key = field.dataset.field;
    if (field.type === "checkbox") field.checked = values[key] === true;
    else if (values[key] !== undefined) field.value = values[key];
  }
  row.querySelector("[data-remove-line]").addEventListener("click", () => {
    row.remove();
    if (!$("#import-customs-lines").children.length) $("#import-customs-lines").append(importLineRow());
    numberImportLines();
  });
  return row;
}

function numberImportLines() {
  const rows = [...$("#import-customs-lines").querySelectorAll(".cost-import-line")];
  rows.forEach((row, index) => {
    row.querySelector("[data-line-number]").textContent = String(index + 1);
    row.querySelector("[data-remove-line]").disabled = rows.length === 1;
  });
}

function syncImportDispatchFields() {
  $("#outside-eu-fields").hidden = $("#import-dispatch-territory").value !== "outside_eu";
}

function importFormFields() {
  return {
    entryDate: $("#import-entry-date").value,
    dispatchTerritory: $("#import-dispatch-territory").value,
    dispatchTerritoryVerified: $("#import-territory-verified").checked,
    isBusinessToConsumer: $("#import-b2c-verified").checked,
    isGift: $("#import-is-gift").checked,
    checkoutTotal: $("#import-checkout-total").value,
    checkoutTotalVerified: $("#import-checkout-verified").checked,
    intrinsicValue: $("#import-intrinsic-value").value,
    intrinsicValueVerified: $("#import-intrinsic-verified").checked,
    customsValuesVerified: $("#import-customs-values-verified").checked,
    postImportCosts: $("#import-post-costs").value,
    postImportCostsVerified: $("#import-post-costs-verified").checked,
    lowValueDutyTreatment: $("#import-low-value-duty").value,
    vatRate: $("#import-vat-rate").value,
    vatRateVerified: $("#import-vat-verified").checked,
    importVatAtCheckout: $("#import-vat-at-checkout").value,
    importVatAtCheckoutVerified: $("#import-vat-at-checkout-verified").checked,
    carrierAdministrationFee: $("#import-carrier-fee").value,
    customsDutyTreatment: $("#import-customs-duty-treatment").value,
    unionHandlingFeeTreatment: $("#import-uhf-treatment").value,
    importVatTreatment: $("#import-vat-treatment").value,
    carrierAdministrationTreatment: $("#import-carrier-treatment").value
  };
}

function importLineFields() {
  return [...$("#import-customs-lines").querySelectorAll(".cost-import-line")].map(row => {
    const values = {};
    for (const input of row.querySelectorAll("[data-field]")) {
      values[input.dataset.field] = input.type === "checkbox" ? input.checked : input.value;
    }
    return values;
  });
}

function showImportResult({ state, title, summary, details = [] }) {
  const panel = $("#import-cost-result");
  panel.dataset.state = state;
  $("#import-cost-result-title").textContent = title;
  $("#import-cost-result-summary").textContent = summary;
  const host = $("#import-cost-result-details");
  host.replaceChildren();
  for (const [label, value] of details) addDetail(label, value, host);
}

function calculateImport(event) {
  event.preventDefault();
  try {
    const input = parseIrishImportFields(importFormFields(), importLineFields());
    const result = calculateIrishImportCharges(input);
    if (!result.exact) {
      showImportResult({
        state: "incomplete",
        title: "No complete consumer total",
        summary: "The entered evidence does not establish all import charges or seller pass-through. Review each gap; no purchase total is being inferred.",
        details: result.gaps.map(gap => ["Evidence still needed", gap])
      });
      return;
    }

    if (result.status === "not_applicable") {
      showImportResult({
        state: "exact",
        title: "No import charge added",
        summary: "The verified dispatch territory is recorded as EU fiscal. Seller VAT treatment remains a separate checkout check.",
        details: [["Seller checkout total", money(input.checkoutTotalMinor)], ["Additional import charges", money(0)], ["Consumer total entered", money(result.consumerTotalMinor)]]
      });
      return;
    }

    const details = [
      ["Seller checkout total", money(input.checkoutTotalMinor)],
      ["Statutory customs duty", money(result.customsDutyMinor)],
      ["Statutory Union Handling Fee", money(result.unionHandlingFeeMinor)]
    ];
    if (input.chargeTreatment.importVat === "additional_on_delivery" && Number.isSafeInteger(result.importVatMinor)) {
      details.push(["Import VAT on delivery", money(result.importVatMinor)]);
    }
    if (input.chargeTreatment.carrierAdministration === "additional_on_delivery" && Number.isSafeInteger(result.carrierAdministrationFeeMinor)) {
      details.push(["Carrier administration amount on delivery", money(result.carrierAdministrationFeeMinor)]);
    }
    details.push(["Additional charges passed to consumer", money(result.consumerAdditionalMinor)]);
    details.push(["Consumer total for this scenario", money(result.consumerTotalMinor)]);
    showImportResult({
      state: "exact",
      title: "Evidence-based import scenario",
      summary: "The marked shipment evidence and charge collection modes produced this total. It is a manual scenario, not a customs clearance or a future quote.",
      details
    });
  } catch (error) {
    showImportResult({
      state: "invalid",
      title: "Check the shipment inputs",
      summary: error instanceof Error ? error.message : "One or more import amounts could not be read safely."
    });
  }
}

function calculate(event) {
  event.preventDefault();
  $("#cost-result-details").replaceChildren();
  try {
    const currency = $("#cost-currency").value;
    const itemsMinor = parseMinorAmount($("#cost-items").value, "Parts subtotal");
    const shippingMinor = parseMinorAmount($("#cost-shipping").value, "Delivery charge");
    const otherMinor = parseMinorAmount($("#cost-other").value, "Other seller charges");
    const priceBasis = $("#cost-price-basis").value;
    let vatRateBasisPoints;
    if (priceBasis === "net" && $("#cost-vat-rate").value.trim()) {
      vatRateBasisPoints = parseRateBasisPoints($("#cost-vat-rate").value);
    }
    const result = calculateIrishCheckoutTotal({
      itemsMinor,
      shippingMinor: shippingMinor + otherMinor,
      currency,
      priceBasis,
      vatRateBasisPoints,
      vatRateVerified: $("#vat-rate-verified").checked,
      priceBasisVerified: $("#checkout-evidence").checked,
      vatNotDueVerified: $("#no-vat-verified").checked
    });

    if (result.status !== "exact") {
      const details = result.gaps.map(gap => ["Evidence still needed", gap]);
      if (currency !== "EUR") details.unshift(["Currency conversion", "This checker does not fetch or apply exchange rates."]);
      showResult({
        state: "incomplete",
        title: "No verified total yet",
        summary: "The entered values do not establish a final consumer total. Resolve the evidence gaps and calculate again.",
        details
      });
      return;
    }

    const details = [
      ["Parts subtotal", money(itemsMinor)],
      ["Delivery", money(shippingMinor)],
      ["Other seller charges", money(otherMinor)],
      [result.additionalVatMinor ? "Additional verified VAT" : "Additional VAT", money(result.additionalVatMinor)]
    ];
    showResult({
      state: "exact",
      title: "Verified checkout total",
      summary: result.taxBasis + ". This is the seller checkout total entered here; it does not include outside-EU import charges.",
      details: [...details, ["Consumer total", money(result.consumerTotalMinor)]]
    });
  } catch (error) {
    showResult({
      state: "invalid",
      title: "Check the entered amounts",
      summary: error instanceof Error ? error.message : "One or more amounts could not be read safely."
    });
  }
}

form.addEventListener("submit", calculate);
form.addEventListener("reset", () => {
  window.setTimeout(() => {
    syncBasisFields();
    syncCurrency();
    showResult({ state: "empty", title: "Waiting for checkout evidence", summary: "Enter the observed amounts and calculate. A total is shown only when the price basis and required tax evidence are confirmed." });
  }, 0);
});
$("#cost-price-basis").addEventListener("change", syncBasisFields);
$("#cost-currency").addEventListener("change", syncCurrency);
const importForm = $("#import-cost-form");
$("#import-customs-lines").append(importLineRow());
numberImportLines();
syncImportDispatchFields();
$("#import-dispatch-territory").addEventListener("change", syncImportDispatchFields);
$("#add-customs-line").addEventListener("click", () => {
  $("#import-customs-lines").append(importLineRow());
  numberImportLines();
});
importForm.addEventListener("submit", calculateImport);
importForm.addEventListener("reset", () => {
  window.setTimeout(() => {
    syncImportDispatchFields();
    numberImportLines();
    showImportResult({ state: "empty", title: "Waiting for shipment evidence", summary: "No import total is calculated until you submit the shipment details." });
  }, 0);
});
$("#cost-rule-version").textContent = IRISH_LANDED_COST_RULES.version;
syncBasisFields();
syncCurrency();

