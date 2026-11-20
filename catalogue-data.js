import { COMPONENTS } from "./data.js";

// Manufacturer-published product identity and specification records. These records
// intentionally contain no prices, retailer availability, or delivery claims.
export const CATALOGUE_SPECS_CHECKED_AT = "2026-11-18";

export const VERIFIED_CATALOGUE_PRODUCTS = [
  {
    id: "amd-ryzen-5-7600-box",
    category: "cpu",
    name: "Ryzen 5 7600 (boxed)",
    brand: "AMD",
    manufacturerPartNumber: "100-100001015BOX",
    sourceUrl: "https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-5-7600.html",
    sourceTitle: "AMD Ryzen 5 7600 specifications",
    sourceCheckedAt: CATALOGUE_SPECS_CHECKED_AT,
    specs: {
      socket: "AM5",
      compatibleChipsets: ["A620", "B650", "B650E", "B840", "B850", "X670", "X670E", "X870", "X870E"],
      memoryGen: "DDR5",
      watts: 65,
      integratedGraphics: true,
      coreCount: 6,
      threadCount: 12,
      thermalSolutionIncluded: true,
      bundledCoolerId: "amd-wraith-stealth-included"
    },
    keySpecs: ["6 cores / 12 threads", "AM5", "65 W default TDP", "Boxed SKU lists the Wraith Stealth thermal solution"]
  },
  {
    id: "amd-ryzen-7-7800x3d-box",
    category: "cpu",
    name: "Ryzen 7 7800X3D (boxed)",
    brand: "AMD",
    manufacturerPartNumber: "100-100000910WOF",
    sourceUrl: "https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-7-7800x3d.html",
    sourceTitle: "AMD Ryzen 7 7800X3D specifications",
    sourceCheckedAt: CATALOGUE_SPECS_CHECKED_AT,
    specs: {
      socket: "AM5",
      compatibleChipsets: ["A620", "B650", "B650E", "B840", "B850", "X670", "X670E", "X870", "X870E"],
      memoryGen: "DDR5",
      watts: 120,
      integratedGraphics: true,
      coreCount: 8,
      threadCount: 16,
      thermalSolutionIncluded: false
    },
    keySpecs: ["8 cores / 16 threads", "AM5", "120 W default TDP", "No thermal solution included"]
  },
  {
    id: "amd-ryzen-5-9600x-box",
    category: "cpu",
    name: "Ryzen 5 9600X (boxed)",
    brand: "AMD",
    manufacturerPartNumber: "100-100001405WOF",
    sourceUrl: "https://www.amd.com/en/products/processors/desktops/ryzen/9000-series/amd-ryzen-5-9600x.html",
    sourceTitle: "AMD Ryzen 5 9600X specifications",
    sourceCheckedAt: "2026-11-20",
    specs: {
      socket: "AM5",
      compatibleChipsets: ["A620", "B650", "B650E", "B840", "B850", "X670", "X670E", "X870", "X870E"],
      memoryGen: "DDR5",
      watts: 65,
      integratedGraphics: true,
      coreCount: 6,
      threadCount: 12,
      baseClockGHz: 3.9,
      maxBoostClockGHz: 5.4,
      thermalSolutionIncluded: false
    },
    keySpecs: ["6 cores / 12 threads", "AM5 / DDR5", "65 W default TDP", "Up to 5.4 GHz boost", "Thermal solution not included"]
  },
  {
    id: "amd-ryzen-7-9700x-box",
    category: "cpu",
    name: "Ryzen 7 9700X (boxed)",
    brand: "AMD",
    manufacturerPartNumber: "100-100001404WOF",
    sourceUrl: "https://www.amd.com/en/products/processors/desktops/ryzen/9000-series/amd-ryzen-7-9700x.html",
    sourceTitle: "AMD Ryzen 7 9700X specifications",
    sourceCheckedAt: "2026-11-20",
    specs: {
      socket: "AM5",
      compatibleChipsets: ["A620", "B650", "B650E", "B840", "B850", "X670", "X670E", "X870", "X870E"],
      memoryGen: "DDR5",
      watts: 65,
      integratedGraphics: true,
      coreCount: 8,
      threadCount: 16,
      baseClockGHz: 3.8,
      maxBoostClockGHz: 5.5,
      thermalSolutionIncluded: false
    },
    keySpecs: ["8 cores / 16 threads", "AM5 / DDR5", "65 W default TDP", "Up to 5.5 GHz boost", "Thermal solution not included"]
  },
  {
    id: "msi-pro-b650m-p",
    category: "motherboard",
    name: "PRO B650M-P",
    brand: "MSI",
    manufacturerPartNumber: "PRO B650M-P",
    sourceUrl: "https://www.msi.com/Motherboard/PRO-B650M-P/Specification",
    sourceTitle: "MSI PRO B650M-P specifications",
    sourceCheckedAt: CATALOGUE_SPECS_CHECKED_AT,
    specs: {
      socket: "AM5",
      chipset: "B650",
      form: "mATX",
      boardSizes: ["mATX"],
      memoryGen: "DDR5",
      maxMemoryGb: 256,
      memorySlots: 4,
      maxMemorySpeedMts: 4800,
      supportedCpuIds: ["amd-ryzen-5-7600-box"],
      pcieSlots: ["PCIe 4.0"],
      m2Slots: [
        { interfaces: ["NVMe"], formFactors: ["M.2 2280", "M.2 2260"], pcieGenerations: [4] },
        { interfaces: ["NVMe"], formFactors: ["M.2 2280", "M.2 2260"], pcieGenerations: [4] }
      ],
      requiredPsuConnectors: ["24-pin", "CPU-8pin"]
    },
    keySpecs: ["AM5 / AMD B650", "Micro-ATX", "4 DDR5 slots, up to 256 GB", "2 PCIe 4.0 x4 M.2 slots"]
  },
  {
    id: "msi-mag-b650-tomahawk-wifi",
    category: "motherboard",
    name: "MAG B650 TOMAHAWK WIFI",
    brand: "MSI",
    manufacturerPartNumber: "MAG B650 TOMAHAWK WIFI",
    sourceUrl: "https://www.msi.com/Motherboard/MAG-B650-TOMAHAWK-WIFI/Specification",
    sourceTitle: "MSI MAG B650 TOMAHAWK WIFI specifications",
    sourceCheckedAt: CATALOGUE_SPECS_CHECKED_AT,
    specs: {
      socket: "AM5",
      chipset: "B650",
      form: "ATX",
      boardSizes: ["ATX"],
      memoryGen: "DDR5",
      maxMemoryGb: 256,
      memorySlots: 4,
      maxMemorySpeedMts: 7600,
      pcieSlots: ["PCIe 4.0"],
      m2Slots: [
        { interfaces: ["NVMe"], formFactors: ["M.2 22110", "M.2 2280"], pcieGenerations: [4] },
        { interfaces: ["NVMe"], formFactors: ["M.2 2280", "M.2 2260"], pcieGenerations: [4] },
        { interfaces: ["NVMe"], formFactors: ["M.2 2280", "M.2 2260"], pcieGenerations: [4] }
      ]
    },
    keySpecs: ["AM5 / AMD B650", "ATX", "4 DDR5 slots, up to 256 GB", "3 PCIe 4.0 M.2 slots", "DDR5-7600+ overclocked memory support"]
  },
  {
    id: "msi-b850-gaming-plus-wifi",
    category: "motherboard",
    name: "B850 GAMING PLUS WIFI",
    brand: "MSI",
    manufacturerPartNumber: "B850 GAMING PLUS WIFI",
    sourceUrl: "https://www.msi.com/Motherboard/B850-GAMING-PLUS-WIFI/Specification",
    sourceTitle: "MSI B850 GAMING PLUS WIFI specifications",
    sourceCheckedAt: "2026-11-20",
    specs: {
      socket: "AM5",
      chipset: "B850",
      form: "ATX",
      boardSizes: ["ATX"],
      memoryGen: "DDR5",
      maxMemoryGb: 256,
      memorySlots: 4,
      maxMemorySpeedMts: 5600,
      maxMemoryOcSpeedMts: 8200,
      supportedCpuSeries: ["Ryzen 7000", "Ryzen 8000", "Ryzen 9000"],
      pcieSlots: ["PCIe 5.0"],
      m2Slots: [
        { interfaces: ["NVMe"], formFactors: ["M.2 2280", "M.2 2260"], pcieGenerations: [5] },
        { interfaces: ["NVMe"], formFactors: ["M.2 22110", "M.2 2280"], pcieGenerations: [4] },
        { interfaces: ["NVMe"], formFactors: ["M.2 2280", "M.2 2260"], pcieGenerations: [4] }
      ]
    },
    keySpecs: ["AM5 / AMD B850", "ATX", "4 DDR5 slots, up to 256 GB", "3 M.2 slots: PCIe 5.0 ×4, PCIe 4.0 ×4 and PCIe 4.0 ×2", "DDR5-5600 JEDEC; up to DDR5-8200+ overclocked for supported configurations"]
  },
  {
    id: "kingston-fury-beast-32gb-ddr5-6000",
    category: "memory",
    name: "FURY Beast 32 GB (2 × 16 GB) DDR5-6000",
    brand: "Kingston",
    manufacturerPartNumber: "KF560C36BBE2K2-32",
    sourceUrl: "https://www.kingston.com/en/memory/search?partId=KF560C36BBE2K2-32",
    sourceTitle: "Kingston FURY Beast KF560C36BBE2K2-32",
    sourceCheckedAt: CATALOGUE_SPECS_CHECKED_AT,
    specs: {
      memoryGen: "DDR5",
      capacityGb: 32,
      moduleCount: 2,
      speedMts: 4800,
      profileSpeedMts: 6000,
      profileName: "AMD EXPO 1.1",
      heightMm: 34.9
    },
    keySpecs: ["32 GB (2 × 16 GB)", "DDR5-4800 JEDEC default", "DDR5-6000 EXPO profile", "34.9 mm module height"]
  },
  {
    id: "asus-dual-rtx4060-o8g",
    category: "graphics",
    name: "Dual GeForce RTX 4060 OC Edition 8 GB",
    brand: "ASUS",
    manufacturerPartNumber: "DUAL-RTX4060-O8G",
    sourceUrl: "https://www.asus.com/be-fr/motherboards-components/graphics-cards/dual/dual-rtx4060-o8g/techspec/",
    sourceTitle: "ASUS Dual RTX 4060 OC Edition specifications",
    sourceCheckedAt: CATALOGUE_SPECS_CHECKED_AT,
    specs: {
      interface: "PCIe 4.0",
      memoryGb: 8,
      length: 227.2,
      thicknessSlots: 2.5,
      recommendedSystemPowerW: 550,
      powerConnectors: ["PCIe-8pin"]
    },
    keySpecs: ["8 GB GDDR6", "PCIe 4.0", "227.2 × 123.24 × 49.6 mm", "2.5 slots", "1 × 8-pin; ASUS recommends a 550 W system PSU"]
  },
  {
    id: "asus-dual-rtx5070-o12g",
    category: "graphics",
    name: "Dual GeForce RTX 5070 OC Edition 12 GB",
    brand: "ASUS",
    manufacturerPartNumber: "DUAL-RTX5070-O12G",
    sourceUrl: "https://www.asus.com/uk/motherboards-components/graphics-cards/dual/dual-rtx5070-o12g/techspec/",
    sourceTitle: "ASUS Dual RTX 5070 OC Edition specifications",
    sourceCheckedAt: "2026-11-20",
    specs: {
      interface: "PCIe 5.0",
      memoryGb: 12,
      length: 249,
      thicknessSlots: 2.53,
      recommendedSystemPowerW: 750,
      powerConnector: "16-pin"
    },
    keySpecs: ["12 GB GDDR7", "PCI Express 5.0", "249 × 126 × 50.6 mm", "2.53 slots", "16-pin power; ASUS recommends a 750 W system PSU"]
  },
  {
    id: "wd-black-sn770-1tb",
    category: "storage",
    name: "WD_BLACK SN770 NVMe SSD 1 TB",
    brand: "Western Digital",
    manufacturerPartNumber: "WDS100T3X0E",
    gtin: "718037887302",
    gtinFormat: "UPC-A",
    sourceUrl: "https://documents.westerndigital.com/content/dam/doc-library/en_us/assets/public/western-digital/product/internal-drives/wd-black-ssd/product-brief-wd-black-sn770-nvme-ssd.pdf",
    sourceTitle: "WD_BLACK SN770 product brief",
    sourceCheckedAt: CATALOGUE_SPECS_CHECKED_AT,
    specs: {
      interface: "NVMe",
      formFactor: "M.2 2280",
      pcieGeneration: 4,
      capacity: 1
    },
    keySpecs: ["1 TB", "M.2 2280", "PCIe Gen4 NVMe x4", "UPC-A 718037887302"]
  },
  {
    id: "corsair-rm650e-2025-eu",
    category: "power",
    name: "RMe Series RM650e (2025, EU)",
    brand: "Corsair",
    manufacturerPartNumber: "CP-9020302-EU",
    sourceUrl: "https://www.corsair.com/eu/en/p/psu/cp-9020302-eu/rme-series-rm650e-fully-modular-low-noise-atx-power-supply-eu-cp-9020302-eu",
    sourceTitle: "Corsair RMe RM650e (EU) specifications",
    sourceCheckedAt: CATALOGUE_SPECS_CHECKED_AT,
    specs: {
      watts: 650,
      formFactor: "ATX",
      lengthMm: 140,
      connectors: ["24-pin", "CPU-8pin", "PCIe-8pin", "12V-2x6"]
    },
    keySpecs: ["650 W", "ATX 3.1", "140 × 150 × 86 mm", "24-pin, EPS 8-pin, PCIe 8-pin and 12V-2x6 cables"]
  },
  {
    id: "fractal-pop-mini-air-rgb-black",
    category: "case",
    name: "Pop Mini Air RGB Black TG Clear Tint",
    brand: "Fractal Design",
    manufacturerPartNumber: "FD-C-POR1M-06",
    gtin: "7340172703600",
    gtinFormat: "GTIN-13",
    sourceUrl: "https://www.fractal-design.com/products/cases/pop-series/pop-mini-air/pop-mini-air-rgb-black-tg-clear-tint/",
    sourceTitle: "Fractal Design Pop Mini Air specifications",
    sourceCheckedAt: CATALOGUE_SPECS_CHECKED_AT,
    specs: {
      boardSizes: ["mATX", "mini-ITX"],
      psuFormats: ["ATX"],
      maxPsuLengthMm: 150,
      maxGpuLength: 365,
      maxGpuSlots: 4,
      maxCoolerHeightMm: 170,
      radiatorSupportMm: [120, 240]
    },
    keySpecs: ["Micro-ATX / Mini-ITX", "GPU clearance 365 mm", "CPU cooler height limit 170 mm", "ATX PSU length limit 150 mm", "GTIN-13 7340172703600"]
  },
  {
    id: "amd-wraith-stealth-included",
    category: "cooler",
    name: "Wraith Stealth (included in Ryzen 5 7600 boxed SKU)",
    brand: "AMD",
    manufacturerPartNumber: null,
    includedWithProductId: "amd-ryzen-5-7600-box",
    sourceUrl: "https://www.amd.com/en/products/processors/desktops/ryzen/7000-series/amd-ryzen-5-7600.html",
    sourceTitle: "AMD Ryzen 5 7600 boxed CPU and thermal solution",
    sourceCheckedAt: CATALOGUE_SPECS_CHECKED_AT,
    specs: {
      sockets: ["AM5"],
      bundledWithCpuId: "amd-ryzen-5-7600-box"
    },
    keySpecs: ["Thermal solution listed by AMD for this boxed CPU", "Not listed as a separate purchasable product"]
  },
  {
    id: "noctua-nh-u12s-redux",
    category: "cooler",
    name: "NH-U12S redux",
    brand: "Noctua",
    manufacturerModel: "NH-U12S redux",
    gtin: "9010018000207",
    gtinFormat: "GTIN-13",
    sourceUrl: "https://www.noctua.at/en/products/nh-u12s-redux/specifications",
    sourceTitle: "Noctua NH-U12S redux specifications",
    sourceCheckedAt: CATALOGUE_SPECS_CHECKED_AT,
    specs: {
      sockets: ["AM5", "AM4"],
      heightMm: 158
    },
    keySpecs: ["AM5 and AM4 mounting support", "158 mm total height", "120 mm PWM fan", "GTIN-13 9010018000207"]
  }
];

export const REFERENCE_BUILD = {
  cpu: "amd-ryzen-5-7600-box",
  cooler: "amd-wraith-stealth-included",
  motherboard: "msi-pro-b650m-p",
  memory: "kingston-fury-beast-32gb-ddr5-6000",
  graphics: "asus-dual-rtx4060-o8g",
  storage: "wd-black-sn770-1tb",
  power: "corsair-rm650e-2025-eu",
  case: "fractal-pop-mini-air-rgb-black"
};

export const REFERENCE_BUILD_COMPONENTS = COMPONENTS.map(component => ({
  ...component,
  productId: REFERENCE_BUILD[component.id]
}));
