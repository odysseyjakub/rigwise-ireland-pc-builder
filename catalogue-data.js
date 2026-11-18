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
      bundledCoolerId: "amd-wraith-stealth-included"
    },
    keySpecs: ["6 cores / 12 threads", "AM5", "65 W default TDP", "Boxed SKU lists the Wraith Stealth thermal solution"]
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
