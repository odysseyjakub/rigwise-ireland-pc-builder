export const PRODUCT_CATEGORIES = Object.freeze({
  cpu: "Processors",
  cooler: "CPU coolers",
  motherboard: "Motherboards",
  memory: "Memory",
  graphics: "Graphics cards",
  storage: "Storage",
  power: "Power supplies",
  case: "Cases"
});

/**
 * Build a side-by-side view model from the local catalogue.
 * Prices in the current catalogue are synthetic examples, never live offers.
 */
export function compareCatalogProducts({ category, productIds, products, offers }) {
  if (!PRODUCT_CATEGORIES[category]) throw new Error("Choose a supported product category");
  if (!Array.isArray(productIds) || !Array.isArray(products) || !Array.isArray(offers)) {
    throw new Error("Product ids, products, and offers must be arrays");
  }
  const ids = productIds.filter(id => typeof id === "string" && id.length > 0);
  if (ids.length < 2 || ids.length > 3) throw new Error("Compare two or three products");
  if (new Set(ids).size !== ids.length) throw new Error("Choose different products to compare");

  const selected = ids.map(id => {
    const product = products.find(candidate => candidate.id === id);
    if (!product) throw new Error("Unknown product: " + id);
    if (product.category !== category) throw new Error("All compared products must be in the same category");
    const qualifyingOffers = offers.filter(offer =>
      offer.componentId === product.id && offer.available === true && Number.isFinite(offer.price) && offer.price >= 0
    );
    return {
      product,
      lowestExamplePrice: qualifyingOffers.length
        ? Math.min(...qualifyingOffers.map(offer => offer.price))
        : null,
      exampleOfferCount: qualifyingOffers.length,
      specs: product.specs && typeof product.specs === "object" ? { ...product.specs } : {}
    };
  });

  const specKeys = [...new Set(selected.flatMap(item => Object.keys(item.specs)))].filter(key => key !== "tier");
  return {
    category,
    categoryLabel: PRODUCT_CATEGORIES[category],
    columns: selected,
    specKeys
  };
}

/**
 * Compare source-linked manufacturer catalogue records without importing or
 * implying retailer offers or prices.
 */
export function compareManufacturerProducts({ category, productIds, products }) {
  if (!PRODUCT_CATEGORIES[category]) throw new Error("Choose a supported product category");
  if (!Array.isArray(productIds) || !Array.isArray(products)) {
    throw new Error("Product ids and products must be arrays");
  }
  const ids = productIds.filter(id => typeof id === "string" && id.length > 0);
  if (ids.length < 2 || ids.length > 3) throw new Error("Compare two or three products");
  if (new Set(ids).size !== ids.length) throw new Error("Choose different products to compare");

  const columns = ids.map(id => {
    const product = products.find(candidate => candidate.id === id);
    if (!product) throw new Error("Unknown product: " + id);
    if (product.category !== category) throw new Error("All compared products must be in the same category");
    return {
      product,
      specs: product.specs && typeof product.specs === "object" ? { ...product.specs } : {}
    };
  });
  const specKeys = [...new Set(columns.flatMap(column => Object.keys(column.specs)))];
  return { category, categoryLabel: PRODUCT_CATEGORIES[category], columns, specKeys };
}
