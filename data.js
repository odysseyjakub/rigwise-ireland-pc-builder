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
  { id: "cpu-6", category: "cpu", name: "AMD Ryzen 5 7600", brand: "AMD", series: "Ryzen 7000", model: "5 7600", sourceUrl: "https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-5-7600.html", fpsCpuSlug: "ryzen-5-7600", detail: "6 cores / 12 threads · AM5 · 65 W TDP", specs: { socket: "AM5", memoryGen: "DDR5", watts: 65, tier: 1 }, icon: "cpu", offers: [195, 190] },
  { id: "cpu-8", category: "cpu", name: "AMD Ryzen 7 7800X3D", brand: "AMD", series: "Ryzen 7000 X3D", model: "7 7800X3D", sourceUrl: "https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-7-7800x3d.html", fpsCpuSlug: "ryzen-7-7800x3d", detail: "8 cores / 16 threads · AM5 · 120 W TDP", specs: { socket: "AM5", memoryGen: "DDR5", watts: 120, tier: 2 }, icon: "cpu", offers: [279, 286] },
  { id: "cpu-am4", category: "cpu", name: "AMD Ryzen 5 5600", brand: "AMD", series: "Ryzen 5000", model: "5 5600", sourceUrl: "https://www.amd.com/en/support/downloads/drivers.html/processors/ryzen/ryzen-5000-series/amd-ryzen-5-5600.html", fpsCpuSlug: "ryzen-5-5600", detail: "6 cores / 12 threads · AM4 · 65 W TDP", specs: { socket: "AM4", memoryGen: "DDR4", watts: 65, tier: 1 }, icon: "cpu", offers: [119, 115] },
  { id: "cooler-am5", category: "cooler", name: "Example AM5 air cooler", detail: "AM5 · 120 W example rating", specs: { sockets: ["AM5"], maxTdp: 120 }, icon: "cooler", offers: [35, 32] },
  { id: "cooler-am4", category: "cooler", name: "Example AM4 air cooler", detail: "AM4 · 95 W example rating", specs: { sockets: ["AM4"], maxTdp: 95 }, icon: "cooler", offers: [25, 23] },
  { id: "cooler-high", category: "cooler", name: "Example tower cooler", detail: "AM5 · 160 W example rating", specs: { sockets: ["AM5"], maxTdp: 160 }, icon: "cooler", offers: [55, 58] },
  { id: "board-b650-atx", category: "motherboard", name: "Example B650 motherboard", detail: "AM5 · ATX · DDR5", specs: { socket: "AM5", memoryGen: "DDR5", form: "ATX", sizeClass: "standard" }, icon: "board", offers: [120, 115] },
  { id: "board-b650-matx", category: "motherboard", name: "Example compact motherboard", detail: "AM5 · micro-ATX · DDR5", specs: { socket: "AM5", memoryGen: "DDR5", form: "mATX", sizeClass: "compact" }, icon: "board", offers: [128, 122] },
  { id: "board-b550", category: "motherboard", name: "Example B550 motherboard", detail: "AM4 · micro-ATX · DDR4", specs: { socket: "AM4", memoryGen: "DDR4", form: "mATX" }, icon: "board", offers: [93, 89] },
  { id: "ram-32-ddr5", category: "memory", name: "Example 32 GB memory kit", detail: "2 × 16 GB · DDR5", specs: { memoryGen: "DDR5", capacity: 32 }, icon: "memory", offers: [85, 83] },
  { id: "ram-16-ddr4", category: "memory", name: "Example 16 GB memory kit", detail: "2 × 8 GB · DDR4", specs: { memoryGen: "DDR4", capacity: 16 }, icon: "memory", offers: [49, 46] },
  { id: "ram-32-ddr4", category: "memory", name: "Example 32 GB DDR4 kit", detail: "2 × 16 GB · DDR4", specs: { memoryGen: "DDR4", capacity: 32 }, icon: "memory", offers: [72, 69] },
  { id: "gpu-starter", category: "graphics", name: "AMD Radeon RX 7600", brand: "AMD", series: "Radeon RX 7000", model: "RX 7600", sourceUrl: "https://www.amd.com/en/products/graphics/desktops/radeon/7000-series/amd-radeon-rx-7600.html", imageUrl: "https://www.amd.com/content/dam/amd/en/images/products/graphics/2648997-amd-radeon-7600.jpg", imageSourceUrl: "https://www.amd.com/en/products/graphics/desktops/radeon/7000-series/amd-radeon-rx-7600.html", fpsGpuSlug: "rx-7600", gpuPowerLabel: "Typical board power", averageGamingPowerW: null, detail: "8 GB GDDR6 · 165 W typical board power · 204 mm reference card", specs: { watts: 165, length: 220, memoryGb: 8, tier: 1 }, icon: "gpu", offers: [215, 208] },
  { id: "gpu-mid", category: "graphics", name: "ASUS Dual GeForce RTX 4060 OC Edition", brand: "NVIDIA", boardPartner: "ASUS", series: "GeForce RTX 40", model: "RTX 4060 OC · 8 GB", sourceUrl: "https://www.asus.com/uk/motherboards-components/graphics-cards/dual/dual-rtx4060-o8g/techspec/", imageUrl: "https://cdn.multitronic.fi/images/prod/B/E/90YV0JC0-M0NA00-3.webp", imageSourceUrl: "https://www.multitronic.fi/en/products/3979658", fpsGpuSlug: "rtx-4060", gpuPowerLabel: "NVIDIA average gaming power", averageGamingPowerW: 110, detail: "8 GB GDDR6 · 110 W average gaming power · 227.2 mm", specs: { watts: 115, length: 227.2, memoryGb: 8, tier: 2 }, icon: "gpu", offers: [270, 285] },
  { id: "gpu-performance", category: "graphics", name: "AMD Radeon RX 7700 XT", brand: "AMD", series: "Radeon RX 7000", model: "RX 7700 XT · 12 GB", sourceUrl: "https://www.amd.com/en/support/downloads/drivers.html/graphics/radeon-rx/radeon-rx-7000-series/amd-radeon-rx-7700-xt.html", imageUrl: "https://tpucdn.com/gpu-specs/images-new/c/3911-top-large.jpg", imageSourceUrl: "https://www.techpowerup.com/gpu-specs/radeon-rx-7700-xt.c3911", fpsGpuSlug: "rx-7700-xt", gpuPowerLabel: "Typical board power", averageGamingPowerW: null, detail: "12 GB GDDR6 · 245 W typical board power · exact card length varies by model", specs: { watts: 245, length: 330, memoryGb: 12, tier: 3 }, icon: "gpu", offers: [429, 445] },
  { id: "storage-512gb", category: "storage", name: "Example 512 GB NVMe SSD", detail: "PCIe · M.2 · 512 GB", specs: { capacity: 0.512 }, icon: "storage", offers: [42, 45] },
  { id: "storage-1tb", category: "storage", name: "Example 1 TB NVMe SSD", detail: "PCIe · M.2 · 1 TB", specs: { capacity: 1 }, icon: "storage", offers: [60, 63] },
  { id: "storage-2tb", category: "storage", name: "Example 2 TB NVMe SSD", detail: "PCIe · M.2 · 2 TB", specs: { capacity: 2 }, icon: "storage", offers: [94, 98] },
  { id: "storage-4tb", category: "storage", name: "Example 4 TB NVMe SSD", detail: "PCIe · M.2 · 4 TB", specs: { capacity: 4 }, icon: "storage", offers: [179, 189] },
  { id: "storage-8tb", category: "storage", name: "Example 8 TB NVMe SSD", detail: "PCIe · M.2 · 8 TB", specs: { capacity: 8 }, icon: "storage", offers: [329, 349] },
  { id: "psu-550", category: "power", name: "Example 550 W power supply", detail: "550 W · ATX · 80+ rated", specs: { watts: 550 }, icon: "power", offers: [66, 64] },
  { id: "psu-650", category: "power", name: "Example 650 W power supply", detail: "650 W · ATX · 80+ rated", specs: { watts: 650 }, icon: "power", offers: [75, 72] },
  { id: "psu-850", category: "power", name: "Example 850 W power supply", detail: "850 W · ATX · 80+ rated", specs: { watts: 850 }, icon: "power", offers: [105, 109] },
  { id: "case-air", category: "case", name: "Example airflow case", detail: "micro-ATX · GPU up to 300 mm", specs: { boardSizes: ["mATX"], maxGpuLength: 300, sizeClass: "compact" }, icon: "case", offers: [65, 68] },
  { id: "case-mid", category: "case", name: "Example mid-tower case", detail: "ATX / micro-ATX · GPU up to 360 mm", specs: { boardSizes: ["ATX", "mATX"], maxGpuLength: 360, sizeClass: "standard" }, icon: "case", offers: [82, 79] }
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

