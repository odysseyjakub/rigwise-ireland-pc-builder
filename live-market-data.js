const PRODUCT_SEARCH = "https://vantaspec.com/api/products/search";
const ECB_RATE = "https://api.frankfurter.dev/v2/rate/GBP/EUR?providers=ECB";
const CACHE_FOR_MS = 15 * 60 * 1000;
const SEARCH_CACHE = new Map();
let cachedRate = null;

export const MARKET_SOURCE = {
  name: "VantaSpec",
  api: "https://vantaspec.com/api-docs",
  refreshedAt: null,
  coverage: "UK retailer catalogue"
};

const CATEGORY_SLUGS = {
  cpu: "cpus",
  graphics: "gpus",
  memory: "ram",
  storage: "ssds",
  motherboard: "motherboards",
  case: "pc-cases",
  power: "psus",
  cooler: "coolers"
};

const DELIVERY_SOURCES = {
  scan: "https://www.scan.co.uk/info/delivery",
  scanIreland: "https://www.scan.co.uk/help/orders/delivery/delivery-europe",
  overclockers: "https://www.overclockers.co.uk/delivery.html",
  overclockersIreland: "https://help.overclockers.co.uk/hc/en-gb/articles/25405437428125-Do-you-deliver-to-Ireland",
  awd: "https://www.awd-it.co.uk/faq",
  awdIreland: "https://www.awd-it.co.uk/france-gaming-pcs"
};

const VERIFIED_SHIPPING = {
  scan: {
    UK: { small: 5.48, large: 11.50, url: DELIVERY_SOURCES.scan, detail: "Published DPD rate: £5.48 express pack up to 5 kg, or £11.50 for one parcel up to 30 kg." },
    IE: { small: 12.59, large: 12.59, url: DELIVERY_SOURCES.scanIreland, detail: "Published DPD rate: £12.59 for one parcel up to 30 kg. Scan says Irish VAT and customs charges are included at checkout." }
  },
  overclockers: {
    UK: { small: 3.99, large: 7.99, url: DELIVERY_SOURCES.overclockers, detail: "Published UK rate: £3.99 standard delivery up to 5 kg; £7.99 for one DPD parcel." },
    IE: { small: 19.99, large: 19.99, url: DELIVERY_SOURCES.overclockersIreland, detail: "Published ROI rate: £19.99 for one parcel. Overclockers says VAT and customs are included; its stated delivery window is 2–4 working days." }
  },
  awd: {
    UK: { small: 0, large: 0, url: DELIVERY_SOURCES.awd, detail: "AWD-IT states that UK mainland standard delivery is free." },
    IE: { small: 16.29, large: 16.29, url: DELIVERY_SOURCES.awdIreland, referenceUrls: [DELIVERY_SOURCES.scan, DELIVERY_SOURCES.overclockers], detail: "AWD-IT confirms ROI delivery and Irish VAT at checkout, but does not publish the delivery fee. Estimate: the mean of Scan (£12.59) and Overclockers UK (£19.99) for one ROI parcel." }
  }
};

function read(values, name) {
  return String(values.get(name) || "");
}

function makeQuery(category, values) {
  switch (category) {
    case "cpu": {
      const socket = read(values, "socket");
      return socket === "AM4" ? "Ryzen 5000 AM4" : socket === "AM5" ? "Ryzen AM5" : "AMD Ryzen desktop processor";
    }
    case "graphics": {
      const series = read(values, "series");
      return series === "GeForce RTX 40" ? "GeForce RTX 40" : series === "Radeon RX 7000" ? "Radeon RX 7000" : "gaming graphics card GPU";
    }
    case "memory": {
      const generation = read(values, "memoryGen");
      const capacity = read(values, "capacity");
      return [capacity === "any" ? "" : capacity + "GB", generation === "any" ? "desktop RAM" : generation + " RAM"].filter(Boolean).join(" ");
    }
    case "storage": {
      const gb = Number(read(values, "capacityGb")) || 512;
      const size = gb >= 1000 ? (gb / 1000) + "TB" : gb + "GB";
      return size + " NVMe SSD";
    }
    case "motherboard": {
      const socket = read(values, "socket");
      const size = read(values, "size");
      const form = size === "compact" ? "micro ATX" : size === "standard" ? "ATX" : "motherboard";
      return [socket === "any" ? "" : socket, form].filter(Boolean).join(" ");
    }
    case "case": {
      const size = read(values, "size");
      return size === "compact" ? "micro ATX PC case" : size === "standard" ? "ATX mid tower PC case" : "PC case ATX";
    }
    case "power": {
      const watts = read(values, "watts");
      return (watts === "any" ? "650W" : watts + "W") + " PSU power supply";
    }
    case "cooler": {
      const socket = read(values, "socket");
      return (socket === "any" ? "AM5 AM4" : socket) + " CPU cooler";
    }
    default:
      throw new TypeError("Choose a PC part to search for.");
  }
}

async function getExchangeRate(fetcher) {
  if (cachedRate && Date.now() - cachedRate.fetchedAt < CACHE_FOR_MS) return cachedRate;
  const response = await fetcher(ECB_RATE, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("The ECB reference exchange rate could not be loaded. Try refreshing in a moment.");
  const data = await response.json();
  if (!Number.isFinite(Number(data.rate)) || Number(data.rate) <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(data.date || "")) {
    throw new Error("The ECB reference exchange rate returned an invalid result.");
  }
  cachedRate = { rate: Number(data.rate), date: data.date, fetchedAt: Date.now() };
  return cachedRate;
}

function retailerKey(name) {
  const value = String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (value.includes("overclockers") || value === "ocuk") return "overclockers";
  if (value.includes("scan")) return "scan";
  if (value.includes("awd")) return "awd";
  return "";
}

function isLargeParcel(category) {
  return category === "case";
}

function shippingFor(retailerName, category, market) {
  const large = isLargeParcel(category);
  const key = retailerKey(retailerName);
  const policy = key && VERIFIED_SHIPPING[key]?.[market];
  if (policy) {
    return {
      amountGBP: large ? policy.large : policy.small,
      type: key === "awd" && market === "IE" ? "estimate" : "published",
      destinationConfirmed: key !== "" && (market !== "IE" || ["scan", "overclockers", "awd"].includes(key)),
      sourceUrl: policy.url,
      referenceUrls: policy.referenceUrls || [],
      description: policy.detail
    };
  }

  if (market === "UK") {
    const amountGBP = large ? 9.75 : 4.74;
    return {
      amountGBP,
      type: "estimate",
      destinationConfirmed: true,
      sourceUrl: null,
      referenceUrls: [DELIVERY_SOURCES.scan, DELIVERY_SOURCES.overclockers],
      description: "No delivery fee was published for this seller in the price source. Estimate based on the average of the comparable small-parcel rates from Scan and Overclockers UK (or their one-parcel rates for a case). Check the seller's checkout for the real amount."
    };
  }

  const amountGBP = 16.29;
  return {
    amountGBP,
    type: "estimate",
    destinationConfirmed: false,
    sourceUrl: null,
    referenceUrls: [DELIVERY_SOURCES.scanIreland, DELIVERY_SOURCES.overclockersIreland],
    description: "No ROI delivery quote or eligibility was available for this seller. This estimate is the average of Scan and Overclockers UK's published one-parcel ROI rates; the retailer may charge differently or may not deliver to your address."
  };
}

function normalizeOffer(raw, category, market, exchange) {
  if (!raw || !Number.isFinite(Number(raw.price)) || Number(raw.price) < 0) return null;
  const currency = String(raw.currency || "GBP").toUpperCase();
  const price = Number(raw.price);
  const shipping = currency === "GBP" ? shippingFor(raw.retailer, category, market) : {
    amountGBP: null,
    type: "unknown",
    destinationConfirmed: false,
    sourceUrl: null,
    description: "This source uses a non-GBP price and no delivery rule is available for that seller. Confirm the delivered price with the retailer."
  };
  const roiVatFactor = market === "IE" && currency === "GBP" ? (1.23 / 1.20) : 1;
  const itemPrice = currency === "GBP" ? price * roiVatFactor : (currency === "EUR" && market === "IE" ? price : null);
  const shippingPrice = currency === "GBP" && Number.isFinite(shipping.amountGBP) ? shipping.amountGBP : null;
  const deliveredGBP = itemPrice === null || shippingPrice === null ? null : itemPrice + shippingPrice;
  const deliveredLocal = deliveredGBP === null ? null : (market === "UK" ? deliveredGBP : deliveredGBP * exchange.rate);
  const itemLocal = itemPrice === null ? null : (market === "UK" ? itemPrice : currency === "EUR" ? itemPrice : itemPrice * exchange.rate);
  const shippingLocal = shippingPrice === null ? null : (market === "UK" ? shippingPrice : shippingPrice * exchange.rate);
  const rawUrl = typeof raw.url === "string" ? raw.url : "";
  let buyUrl = null;
  try {
    const url = new URL(rawUrl);
    if (url.protocol === "https:" || url.protocol === "http:") buyUrl = url.href;
  } catch { /* omit a malformed merchant link */ }

  return {
    retailer: String(raw.retailer || "Retailer").slice(0, 100),
    itemSourcePrice: price,
    sourceCurrency: currency,
    itemPrice: itemLocal,
    shippingPrice: shippingLocal,
    shippingCurrency: market === "UK" ? "GBP" : "EUR",
    deliveredPrice: deliveredLocal,
    deliveryType: shipping.type,
    deliveryVerified: shipping.type === "published" && shipping.destinationConfirmed,
    destinationConfirmed: shipping.destinationConfirmed,
    deliveryDetails: shipping.description,
    deliverySourceUrl: shipping.sourceUrl,
    deliveryReferenceUrls: shipping.referenceUrls || [],
    inStock: raw.inStock === true,
    stockKnown: typeof raw.inStock === "boolean",
    buyUrl
  };
}

function makeSpecs(product, category) {
  const text = [product.name, product.model, product.description].filter(Boolean).join(" ").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const specs = [];
  const addMatch = (pattern, label) => {
    const match = text.match(pattern);
    if (match && !specs.some(item => item.toLowerCase() === match[0].toLowerCase())) specs.push(label ? label(match[0]) : match[0]);
  };
  addMatch(/\bAM[45]\b/i, value => value.toUpperCase());
  addMatch(/\b(?:LGA|Socket)\s*\d{3,5}\b/i, value => value.toUpperCase().replace(/\s+/g, ""));
  addMatch(/\bDDR[45]\b/i, value => value.toUpperCase());
  addMatch(/\b\d{1,2}\s*(?:x|×)\s*\d{1,3}\s*GB\b/i, value => value.replace(/\s+/g, " "));
  addMatch(/\b(?:512\s*GB|1\s*TB|2\s*TB|4\s*TB|8\s*TB)\b/i, value => value.replace(/\s+/g, " ").toUpperCase());
  addMatch(/\b\d{3,4}\s*W\b/i, value => value.replace(/\s+/g, " "));
  addMatch(/\b(?:ATX|Micro-ATX|Micro ATX|mATX|Mini-ITX|E-ATX)\b/i, value => value.toUpperCase());
  addMatch(/\b\d+\s*(?:cores?|threads?)\b/i, value => value.replace(/\s+/g, " "));
  addMatch(/\b(?:GDDR[56X]|HBM2E?)\b/i, value => value.toUpperCase());
  if (!specs.length && typeof product.description === "string") specs.push(product.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 150));
  if (!specs.length) specs.push(category === "graphics" ? "Check VRAM and card dimensions" : "Some compatibility details are not listed by the source");
  return specs.slice(0, 4).join(" · ");
}

function needStatus(product, category, values) {
  const text = [product.name, product.model, product.description].filter(Boolean).join(" ").toLowerCase();
  const findGen = text.match(/\bddr([45])\b/);
  if (category === "cpu" || category === "motherboard" || category === "cooler") {
    const desired = read(values, "socket");
    if (desired && desired !== "any") {
      const found = text.match(/\bam([45])\b/i);
      if (found && found[1] !== desired.slice(-1)) return "mismatch";
      if (!found) return "check";
    }
  }
  if (category === "memory") {
    const desired = read(values, "memoryGen");
    if (desired && desired !== "any" && findGen && findGen[1] !== desired.slice(-1)) return "mismatch";
    if (desired && desired !== "any" && !findGen) return "check";
    const wantedCapacity = read(values, "capacity");
    const foundCapacity = text.match(/\b(8|16|32|64|96|128)\s*gb\b/);
    if (wantedCapacity !== "any" && foundCapacity && Number(foundCapacity[1]) < Number(wantedCapacity)) return "mismatch";
    if (wantedCapacity !== "any" && !foundCapacity) return "check";
  }
  if (category === "storage") {
    const wanted = Number(read(values, "capacityGb"));
    const found = text.match(/\b(\d+(?:\.\d+)?)\s*(tb|gb)\b/i);
    const foundGb = found ? Number(found[1]) * (found[2].toLowerCase() === "tb" ? 1000 : 1) : null;
    if (foundGb !== null && foundGb < wanted) return "mismatch";
    if (foundGb === null) return "check";
  }
  if (category === "graphics") {
    const desired = read(values, "series");
    if (desired === "GeForce RTX 40" && /\brtx\s*(?:20|30|50)\d{2}\b/.test(text)) return "mismatch";
    if (desired === "Radeon RX 7000" && /\brx\s*(?:5|6|9)\d{3}\b/.test(text)) return "mismatch";
  }
  return "match";
}

export async function fetchLiveParts(category, values, market, { fetcher = fetch, force = false } = {}) {
  const query = makeQuery(category, values);
  const key = [category, market, query].join("|");
  const now = Date.now();
  let result = !force ? SEARCH_CACHE.get(key) : null;
  if (!result || now - result.fetchedAt >= CACHE_FOR_MS) {
    const params = new URLSearchParams({ q: query, category: CATEGORY_SLUGS[category], limit: "50", sort: "price_asc" });
    const response = await fetcher(PRODUCT_SEARCH + "?" + params.toString(), { cache: "no-store", headers: { Accept: "application/json" } });
    if (response.status === 429) throw new Error("The product source is busy. Wait a minute, then refresh the offers.");
    if (!response.ok) throw new Error("Live product search is temporarily unavailable. Please try again.");
    const body = await response.json();
    if (!Array.isArray(body.products)) throw new Error("The product source returned an unexpected response.");
    result = { products: body.products, fetchedAt: Date.now(), correctedQuery: body.correctedQuery || null };
    SEARCH_CACHE.set(key, result);
  }

  const exchange = market === "IE" ? await getExchangeRate(fetcher) : { rate: 1, date: null, fetchedAt: Date.now() };
  const products = result.products.map(product => {
    const status = needStatus(product, category, values);
    const offers = (Array.isArray(product.prices) ? product.prices : [])
      .map(offer => normalizeOffer(offer, category, market, exchange))
      .filter(Boolean)
      .sort((a, b) => {
        if (a.deliveryVerified !== b.deliveryVerified) return a.deliveryVerified ? -1 : 1;
        if (a.inStock !== b.inStock) return a.inStock ? -1 : 1;
        return (a.deliveredPrice ?? Infinity) - (b.deliveredPrice ?? Infinity);
      });
    return {
      id: String(product.id || product.slug || product.name),
      slug: String(product.slug || ""),
      name: String(product.displayName || product.name || "PC component").slice(0, 180),
      brand: String(product.brand || "").slice(0, 80),
      imageUrl: typeof product.imageUrl === "string" ? product.imageUrl : "",
      specs: makeSpecs(product, category),
      needStatus: status,
      offers
    };
  }).filter(product => product.needStatus !== "mismatch" && product.offers.some(offer => offer.itemPrice !== null));

  return {
    products,
    query: result.correctedQuery || query,
    fetchedAt: new Date(result.fetchedAt).toISOString(),
    exchangeRate: market === "IE" ? { rate: exchange.rate, date: exchange.date } : null,
    source: MARKET_SOURCE
  };
}
