export function parseMinorAmount(value, label) {
  const normalized = String(value ?? "").trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) throw new Error(label + " must be a non-negative amount with up to two decimal places.");
  const [whole, fraction = ""] = normalized.split(".");
  const minor = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (minor > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(label + " is too large to calculate safely.");
  return Number(minor);
}

export function parseRateBasisPoints(value) {
  const normalized = String(value ?? "").trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) throw new Error("Enter the verified VAT rate as a percentage.");
  const [whole, fraction = ""] = normalized.split(".");
  const basisPoints = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (basisPoints > 10000n) throw new Error("VAT rate must be 100% or less.");
  return Number(basisPoints);
}

