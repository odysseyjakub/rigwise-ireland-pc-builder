import test from "node:test";
import assert from "node:assert/strict";
import { checkCompatibility } from "../compatibility.js";
import { COMPONENTS, DEFAULT_BUILD, PRODUCTS } from "../data.js";

function detailedProducts() {
  const products = PRODUCTS.map(product => ({ ...product, specs: { ...product.specs } }));
  const patch = (id, specs) => {
    const product = products.find(item => item.id === id);
    product.specs = { ...product.specs, ...specs };
  };

  patch("cpu-6", { compatibleChipsets: ["B650"], integratedGraphics: true });
  patch("cpu-8", { compatibleChipsets: ["B650"], integratedGraphics: true });
  patch("cpu-am4", { compatibleChipsets: ["B550"], integratedGraphics: false });

  patch("cooler-am5", { heightMm: 155, ramClearanceMm: 45, radiatorSizeMm: 0 });
  patch("cooler-am4", { heightMm: 150, ramClearanceMm: 42, radiatorSizeMm: 0 });
  patch("cooler-high", { heightMm: 160, ramClearanceMm: 45, radiatorSizeMm: 0 });

  const am5Board = {
    chipset: "B650",
    supportedCpuIds: ["cpu-6", "cpu-8"],
    biosVersion: "1.2",
    minimumBiosByCpu: { "cpu-6": "1.0", "cpu-8": "1.3" },
    maxMemoryGb: 128,
    memorySlots: 4,
    maxMemorySpeedMts: 6400,
    m2Slots: [{ interfaces: ["NVMe", "SATA"], formFactors: ["M.2 2280", "M.2 2260"], pcieGenerations: [3, 4] }],
    pcieSlots: ["PCIe x16"],
    requiredPsuConnectors: ["24-pin", "CPU-8pin"]
  };
  patch("board-b650-atx", am5Board);
  patch("board-b650-matx", am5Board);
  patch("board-b550", {
    chipset: "B550",
    supportedCpuIds: ["cpu-am4"],
    biosVersion: "2.0",
    minimumBiosByCpu: { "cpu-am4": "1.0" },
    maxMemoryGb: 128,
    memorySlots: 4,
    maxMemorySpeedMts: 3600,
    m2Slots: [{ interfaces: ["NVMe", "SATA"], formFactors: ["M.2 2280", "M.2 2260"], pcieGenerations: [3, 4] }],
    pcieSlots: ["PCIe x16"],
    requiredPsuConnectors: ["24-pin", "CPU-8pin"]
  });

  patch("ram-32-ddr5", { capacityGb: 32, moduleCount: 2, speedMts: 6000, heightMm: 35 });
  patch("ram-16-ddr4", { capacityGb: 16, moduleCount: 2, speedMts: 3200, heightMm: 34 });
  patch("ram-32-ddr4", { capacityGb: 32, moduleCount: 2, speedMts: 3200, heightMm: 35 });

  patch("gpu-starter", { thicknessSlots: 2, interface: "PCIe x16", powerConnectors: ["1x8-pin"] });
  patch("gpu-mid", { thicknessSlots: 2.5, interface: "PCIe x16", powerConnectors: ["1x8-pin"] });
  patch("gpu-performance", { thicknessSlots: 3, interface: "PCIe x16", powerConnectors: ["2x8-pin"] });

  patch("storage-1tb", { capacityGb: 1000, interface: "NVMe", formFactor: "M.2 2280", pcieGeneration: 4 });
  patch("storage-2tb", { capacityGb: 2000, interface: "NVMe", formFactor: "M.2 2280", pcieGeneration: 4 });

  for (const id of ["psu-550", "psu-650", "psu-850"]) {
    patch(id, { formFactor: "ATX", connectors: ["24-pin", "CPU-8pin", "1x8-pin", "2x8-pin"], lengthMm: 140 });
  }
  patch("case-air", { maxGpuSlots: 2.7, maxCoolerHeightMm: 155, maxPsuLengthMm: 160, radiatorSupportMm: [120, 240], psuFormats: ["ATX"] });
  patch("case-mid", { maxGpuSlots: 3.5, maxCoolerHeightMm: 165, maxPsuLengthMm: 220, radiatorSupportMm: [120, 240, 360], psuFormats: ["ATX"] });
  return products;
}

function evaluate(overrides = {}, products = detailedProducts(), requirements = {}, omittedSlots = []) {
  const build = { ...DEFAULT_BUILD, ...overrides };
  return checkCompatibility({
    components: COMPONENTS.filter(component => !omittedSlots.includes(component.id)).map(component => ({
      ...component,
      productId: build[component.id]
    })),
    products,
    requirements
  });
}

function has(result, id, status) {
  return result.checks.some(check => check.id === id && (!status || check.status === status));
}

test("a fully specified compatible example passes every recorded rule", () => {
  const result = evaluate();
  assert.equal(result.status, "compatible");
  assert.equal(result.issues.length, 0);
  assert.ok(result.checks.length >= 15);
});

test("the published example does not claim full compatibility when specs are missing", () => {
  const result = evaluate({}, PRODUCTS);
  assert.equal(result.status, "unknown");
  assert.ok(result.unknownCount > 0);
  assert.ok(has(result, "cpu-board-socket", "compatible"));
  assert.ok(has(result, "cpu-board-chipset", "unknown"));
  assert.ok(result.issues.some(check => check.status === "unknown"));
});

test("detects a mismatched CPU socket and unsupported chipset", () => {
  const socket = evaluate({ cpu: "cpu-am4" });
  assert.ok(has(socket, "cpu-board-socket", "incompatible"));

  const products = detailedProducts();
  const cpu = products.find(product => product.id === "cpu-6");
  cpu.specs.compatibleChipsets = ["X670"];
  assert.ok(has(evaluate({}, products), "cpu-board-chipset", "incompatible"));
});

test("flags a BIOS update when the installed example version is below the CPU minimum", () => {
  const products = detailedProducts();
  products.find(product => product.id === "board-b650-atx").specs.biosVersion = "1.0";
  const result = evaluate({ cpu: "cpu-8" }, products);
  assert.equal(result.status, "warning");
  assert.ok(has(result, "cpu-board-bios", "warning"));
});

test("detects memory generation, capacity and slot incompatibilities", () => {
  const generation = evaluate({ memory: "ram-16-ddr4" });
  assert.ok(has(generation, "memory-generation", "incompatible"));

  const products = detailedProducts();
  products.find(product => product.id === "board-b650-atx").specs.maxMemoryGb = 16;
  products.find(product => product.id === "board-b650-atx").specs.memorySlots = 1;
  const capacity = evaluate({}, products);
  assert.ok(has(capacity, "memory-capacity-slots", "incompatible"));
});

test("warns when a memory kit is rated above the board's listed speed", () => {
  const products = detailedProducts();
  products.find(product => product.id === "ram-32-ddr5").specs.speedMts = 7200;
  assert.ok(has(evaluate({}, products), "memory-speed", "warning"));
});

test("detects motherboard form factor and graphics length or thickness clearance", () => {
  const result = evaluate({ case: "case-air", graphics: "gpu-performance" });
  assert.ok(has(result, "motherboard-case-form", "incompatible"));
  assert.ok(has(result, "gpu-length", "incompatible"));

  const products = detailedProducts();
  products.find(product => product.id === "gpu-mid").specs.thicknessSlots = 4;
  assert.ok(has(evaluate({}, products), "gpu-thickness", "incompatible"));
});

test("checks cooler mounting, thermal rating, case height and RAM clearance", () => {
  const mounting = evaluate({ cooler: "cooler-am4" });
  assert.ok(has(mounting, "cooler-socket", "incompatible"));

  const products = detailedProducts();
  products.find(product => product.id === "cooler-am5").specs.maxTdp = 45;
  products.find(product => product.id === "cooler-am5").specs.heightMm = 180;
  products.find(product => product.id === "cooler-am5").specs.ramClearanceMm = 30;
  const fit = evaluate({}, products);
  assert.ok(has(fit, "cooler-capacity", "warning"));
  assert.ok(has(fit, "cooler-case-fit", "incompatible"));
  assert.ok(has(fit, "cooler-memory-clearance", "incompatible"));
});

test("reports unsupported storage interface and PCIe downgrade", () => {
  const products = detailedProducts();
  products.find(product => product.id === "board-b650-atx").specs.m2Slots = [
    { interfaces: ["SATA"], formFactors: ["M.2 2242"], pcieGenerations: [3] }
  ];
  assert.ok(has(evaluate({}, products), "storage-interface", "incompatible"));

  const slower = detailedProducts();
  slower.find(product => product.id === "board-b650-atx").specs.m2Slots[0].pcieGenerations = [3];
  assert.ok(has(evaluate({}, slower), "storage-interface", "warning"));

  const unknownGeneration = detailedProducts();
  delete unknownGeneration.find(product => product.id === "board-b650-atx").specs.m2Slots[0].pcieGenerations;
  assert.ok(has(evaluate({}, unknownGeneration), "storage-interface", "unknown"));
});

test("checks PSU headroom, GPU connectors, motherboard connectors, and PSU form factor", () => {
  const headroom = evaluate({ cpu: "cpu-8", cooler: "cooler-high", graphics: "gpu-performance", power: "psu-550" });
  assert.ok(has(headroom, "psu-capacity", "warning"));

  const products = detailedProducts();
  products.find(product => product.id === "psu-650").specs.connectors = ["24-pin", "CPU-8pin"];
  const connectors = evaluate({}, products);
  assert.ok(has(connectors, "gpu-power-connectors", "incompatible"));

  const size = detailedProducts();
  size.find(product => product.id === "psu-650").specs.formFactor = "SFX";
  assert.ok(has(evaluate({}, size), "psu-case-fit", "incompatible"));
});

test("requires a dedicated GPU only when requested and validates integrated graphics", () => {
  const missing = evaluate({}, detailedProducts(), { requiresDedicatedGpu: true }, ["graphics"]);
  assert.ok(has(missing, "required-dedicated-gpu", "incompatible"));

  const integrated = evaluate({}, detailedProducts(), {}, ["graphics"]);
  assert.equal(integrated.status, "compatible");
  assert.ok(has(integrated, "integrated-graphics", "compatible"));

  const noIgp = evaluate({ cpu: "cpu-am4" }, detailedProducts(), {}, ["graphics"]);
  assert.ok(has(noIgp, "integrated-graphics", "incompatible"));
});

test("marks missing specification fields unknown instead of treating them as passing", () => {
  const products = detailedProducts();
  delete products.find(product => product.id === "board-b650-atx").specs.m2Slots;
  const result = evaluate({}, products);
  assert.ok(has(result, "storage-interface", "unknown"));
  assert.notEqual(result.status, "compatible");
});
