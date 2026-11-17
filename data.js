export const RETAILERS = {
  sampleA: { id: "sample-a", name: "Sample shop A", shortName: "Shop A", note: "€9/order · free over €350", shipping: { rate: 9, freeOver: 350 } },
  sampleB: { id: "sample-b", name: "Sample shop B", shortName: "Shop B", note: "€7/item · demo rule", shipping: { rate: 7, perItem: true } }
};

export const COUNTIES = [
  "Carlow", "Cavan", "Clare", "Cork", "Donegal", "Dublin", "Galway", "Kerry",
  "Kildare", "Kilkenny", "Laois", "Leitrim", "Limerick", "Longford", "Louth",
  "Mayo", "Meath", "Monaghan", "Offaly", "Roscommon", "Sligo", "Tipperary",
  "Waterford", "Westmeath", "Wexford", "Wicklow"
];

export const SHIPPING_RULES = Object.fromEntries(
  Object.values(RETAILERS).map(retailer => [retailer.id, retailer.shipping])
);

export const PRODUCTS = [
  { id: "cpu-6", category: "cpu", name: "Example 6-core CPU", detail: "AM5 · 65 W · DDR5", specs: { socket: "AM5", memoryGen: "DDR5", watts: 65, tier: 1 }, icon: "cpu", offers: [195, 190] },
  { id: "cpu-8", category: "cpu", name: "Example 8-core CPU", detail: "AM5 · 105 W · DDR5", specs: { socket: "AM5", memoryGen: "DDR5", watts: 105, tier: 2 }, icon: "cpu", offers: [279, 286] },
  { id: "cpu-am4", category: "cpu", name: "Example AM4 6-core CPU", detail: "AM4 · 65 W · DDR4", specs: { socket: "AM4", memoryGen: "DDR4", watts: 65, tier: 1 }, icon: "cpu", offers: [119, 115] },
  { id: "cooler-am5", category: "cooler", name: "Example AM5 air cooler", detail: "AM5 · 120 W example rating", specs: { sockets: ["AM5"], maxTdp: 120 }, icon: "cooler", offers: [35, 32] },
  { id: "cooler-am4", category: "cooler", name: "Example AM4 air cooler", detail: "AM4 · 95 W example rating", specs: { sockets: ["AM4"], maxTdp: 95 }, icon: "cooler", offers: [25, 23] },
  { id: "cooler-high", category: "cooler", name: "Example tower cooler", detail: "AM5 · 160 W example rating", specs: { sockets: ["AM5"], maxTdp: 160 }, icon: "cooler", offers: [55, 58] },
  { id: "board-b650-atx", category: "motherboard", name: "Example B650 motherboard", detail: "AM5 · ATX · DDR5", specs: { socket: "AM5", memoryGen: "DDR5", form: "ATX" }, icon: "board", offers: [120, 115] },
  { id: "board-b650-matx", category: "motherboard", name: "Example compact motherboard", detail: "AM5 · micro-ATX · DDR5", specs: { socket: "AM5", memoryGen: "DDR5", form: "mATX" }, icon: "board", offers: [128, 122] },
  { id: "board-b550", category: "motherboard", name: "Example B550 motherboard", detail: "AM4 · micro-ATX · DDR4", specs: { socket: "AM4", memoryGen: "DDR4", form: "mATX" }, icon: "board", offers: [93, 89] },
  { id: "ram-32-ddr5", category: "memory", name: "Example 32 GB memory kit", detail: "2 × 16 GB · DDR5", specs: { memoryGen: "DDR5", capacity: 32 }, icon: "memory", offers: [85, 83] },
  { id: "ram-16-ddr4", category: "memory", name: "Example 16 GB memory kit", detail: "2 × 8 GB · DDR4", specs: { memoryGen: "DDR4", capacity: 16 }, icon: "memory", offers: [49, 46] },
  { id: "ram-32-ddr4", category: "memory", name: "Example 32 GB DDR4 kit", detail: "2 × 16 GB · DDR4", specs: { memoryGen: "DDR4", capacity: 32 }, icon: "memory", offers: [72, 69] },
  { id: "gpu-starter", category: "graphics", name: "Example starter graphics card", detail: "8 GB · 165 W · 220 mm", specs: { watts: 165, length: 220, tier: 1 }, icon: "gpu", offers: [215, 208] },
  { id: "gpu-mid", category: "graphics", name: "Example 12 GB graphics card", detail: "12 GB · 220 W · 280 mm", specs: { watts: 220, length: 280, tier: 2 }, icon: "gpu", offers: [270, 285] },
  { id: "gpu-performance", category: "graphics", name: "Example performance card", detail: "16 GB · 300 W · 330 mm", specs: { watts: 300, length: 330, tier: 3 }, icon: "gpu", offers: [429, 445] },
  { id: "storage-1tb", category: "storage", name: "Example 1 TB NVMe SSD", detail: "PCIe · M.2 · 1 TB", specs: { capacity: 1 }, icon: "storage", offers: [60, 63] },
  { id: "storage-2tb", category: "storage", name: "Example 2 TB NVMe SSD", detail: "PCIe · M.2 · 2 TB", specs: { capacity: 2 }, icon: "storage", offers: [94, 98] },
  { id: "psu-550", category: "power", name: "Example 550 W power supply", detail: "550 W · ATX · 80+ rated", specs: { watts: 550 }, icon: "power", offers: [66, 64] },
  { id: "psu-650", category: "power", name: "Example 650 W power supply", detail: "650 W · ATX · 80+ rated", specs: { watts: 650 }, icon: "power", offers: [75, 72] },
  { id: "psu-850", category: "power", name: "Example 850 W power supply", detail: "850 W · ATX · 80+ rated", specs: { watts: 850 }, icon: "power", offers: [105, 109] },
  { id: "case-air", category: "case", name: "Example airflow case", detail: "micro-ATX · GPU up to 300 mm", specs: { boardSizes: ["mATX"], maxGpuLength: 300 }, icon: "case", offers: [65, 68] },
  { id: "case-mid", category: "case", name: "Example mid-tower case", detail: "ATX / micro-ATX · GPU up to 360 mm", specs: { boardSizes: ["ATX", "mATX"], maxGpuLength: 360 }, icon: "case", offers: [82, 79] }
];

const retailerOrder = [RETAILERS.sampleA.id, RETAILERS.sampleB.id];
export const OFFERS = PRODUCTS.flatMap(product =>
  product.offers.map((price, index) => ({
    id: product.id + "-" + retailerOrder[index],
    componentId: product.id,
    retailerId: retailerOrder[index],
    price,
    available: true,
    evidence: "synthetic-demo-fixture"
  }))
);

export const BUNDLES = [
  {
    id: "sample-am5-core-kit",
    name: "Sample AM5 core bundle",
    covers: ["cpu-6", "board-b650-atx"],
    retailerId: RETAILERS.sampleA.id,
    price: 295,
    available: true,
    evidence: "synthetic-demo-fixture"
  }
];

export const COMPONENTS = [
  { id: "cpu", label: "Processor", category: "cpu", icon: "cpu" },
  { id: "cooler", label: "CPU cooler", category: "cooler", icon: "cooler" },
  { id: "motherboard", label: "Motherboard", category: "motherboard", icon: "board" },
  { id: "memory", label: "Memory", category: "memory", icon: "memory" },
  { id: "graphics", label: "Graphics card", category: "graphics", icon: "gpu" },
  { id: "storage", label: "Storage", category: "storage", icon: "storage" },
  { id: "power", label: "Power supply", category: "power", icon: "power" },
  { id: "case", label: "Case", category: "case", icon: "case" }
];

export const DEFAULT_BUILD = {
  cpu: "cpu-6",
  cooler: "cooler-am5",
  motherboard: "board-b650-atx",
  memory: "ram-32-ddr5",
  graphics: "gpu-mid",
  storage: "storage-1tb",
  power: "psu-650",
  case: "case-mid"
};

