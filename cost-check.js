import { calculateIrishCheckoutTotal, IRISH_LANDED_COST_RULES } from "./irish-costs.js";
import { parseMinorAmount, parseRateBasisPoints } from "./cost-check-input.js";

const $ = selector => document.querySelector(selector);
const form = $("#cost-check-form");
const resultPanel = $("#cost-result");

function money(minor, currency = "EUR") {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(minor / 100);
}

function addDetail(label, value) {
  const row = document.createElement("div");
  row.className = "cost-result-row";
  const term = document.createElement("span");
  term.textContent = label;
  const detail = document.createElement("strong");
  detail.textContent = value;
  row.append(term, detail);
  $("#cost-result-details").append(row);
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
$("#cost-rule-version").textContent = IRISH_LANDED_COST_RULES.version;
syncBasisFields();
syncCurrency();

