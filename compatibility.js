const PASS = "compatible";
const WARNING = "warning";
const FAIL = "incompatible";
const UNKNOWN = "unknown";
const NOT_APPLICABLE = "not-applicable";

function versionParts(value) {
  if (typeof value !== "string" || !/^\d+(?:\.\d+)*$/.test(value)) return null;
  return value.split(".").map(Number);
}

function compareVersions(left, right) {
  const a = versionParts(left);
  const b = versionParts(right);
  if (!a || !b) return null;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const difference = (a[i] ?? 0) - (b[i] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

export function checkCompatibility({ components, products, requirements = {} }) {
  const productBySlot = Object.fromEntries(components.map(component => [
    component.id,
    products.find(product => product.id === component.productId)
  ]));
  const productIdBySlot = Object.fromEntries(components.map(component => [component.id, component.productId]));
  const cpu = productBySlot.cpu;
  const cooler = productBySlot.cooler;
  const board = productBySlot.motherboard;
  const memory = productBySlot.memory;
  const gpu = productBySlot.graphics;
  const storage = productBySlot.storage;
  const power = productBySlot.power;
  const pcCase = productBySlot.case;
  const checks = [];

  function add(id, status, title, detail) {
    checks.push({ id, status, title, detail });
  }

  function unknown(id, title, detail) {
    add(id, UNKNOWN, title, detail || "The selected example parts do not include enough verified specification data to check this.");
  }

  function compare(id, title, left, right, describe, matches = (a, b) => a === b) {
    if (!hasValue(left) || !hasValue(right)) {
      unknown(id, title, describe("unknown", "unknown"));
      return;
    }
    if (matches(left, right)) add(id, PASS, title, describe(left, right));
    else add(id, FAIL, title, describe(left, right));
  }

  for (const component of components) {
    if (!productBySlot[component.id]) {
      unknown("catalog-" + component.id, "Catalogue part data", "No catalogue record is available for the selected " + component.label.toLowerCase() + ".");
    }
  }

  compare(
    "cpu-board-socket",
    "Processor and motherboard socket",
    cpu?.specs?.socket,
    board?.specs?.socket,
    (cpuSocket, boardSocket) => cpuSocket === "unknown" || boardSocket === "unknown"
      ? "The CPU or board socket is missing from the example specs."
      : cpuSocket === boardSocket
        ? "Both example parts use " + cpuSocket + "."
        : cpuSocket + " and " + boardSocket + " do not match."
  );

  const compatibleChipsets = cpu?.specs?.compatibleChipsets;
  const chipset = board?.specs?.chipset;
  if (Array.isArray(compatibleChipsets) && hasValue(chipset)) {
    const supported = compatibleChipsets.includes(chipset);
    add(
      "cpu-board-chipset",
      supported ? PASS : FAIL,
      "Processor chipset support",
      supported ? "The example CPU lists the " + chipset + " chipset." : "The CPU's listed chipset support does not include " + chipset + "."
    );
  } else {
    unknown("cpu-board-chipset", "Processor chipset support", "The CPU or motherboard chipset support data is missing.");
  }

  const cpuId = productIdBySlot.cpu;
  const supportedCpuIds = board?.specs?.supportedCpuIds;
  const biosVersion = board?.specs?.biosVersion;
  const minimumBios = board?.specs?.minimumBiosByCpu?.[cpuId];
  if (Array.isArray(supportedCpuIds) && hasValue(cpuId) && !supportedCpuIds.includes(cpuId)) {
    add("cpu-board-bios", FAIL, "Processor BIOS support", "The motherboard example does not list support for this processor.");
  } else if (!hasValue(biosVersion) || !hasValue(minimumBios)) {
    unknown("cpu-board-bios", "Processor BIOS support", "The board's installed BIOS version or the CPU's minimum BIOS version is unknown.");
  } else {
    const comparison = compareVersions(biosVersion, minimumBios);
    if (comparison === null) {
      unknown("cpu-board-bios", "Processor BIOS support", "The BIOS version data is not in a comparable numeric format.");
    } else if (comparison < 0) {
      add("cpu-board-bios", WARNING, "Processor BIOS support", "A BIOS update to version " + minimumBios + " or later is indicated for this CPU.");
    } else {
      add("cpu-board-bios", PASS, "Processor BIOS support", "The example BIOS version meets the listed minimum for this CPU.");
    }
  }

  compare(
    "memory-generation",
    "Memory generation",
    board?.specs?.memoryGen,
    memory?.specs?.memoryGen,
    (boardGeneration, memoryGeneration) => boardGeneration === "unknown" || memoryGeneration === "unknown"
      ? "The board or memory generation is missing from the example specs."
      : boardGeneration === memoryGeneration
        ? "Both example parts use " + boardGeneration + "."
        : "The motherboard supports " + boardGeneration + "; the selected kit is " + memoryGeneration + "."
  );

  const memoryCapacity = memory?.specs?.capacityGb ?? memory?.specs?.capacity;
  const maximumMemory = board?.specs?.maxMemoryGb;
  const moduleCount = memory?.specs?.moduleCount;
  const memorySlots = board?.specs?.memorySlots;
  if (![memoryCapacity, maximumMemory, moduleCount, memorySlots].every(hasValue)) {
    unknown("memory-capacity-slots", "Memory capacity and slots", "Module count or the board's supported memory capacity/slot count is missing.");
  } else if (memoryCapacity > maximumMemory || moduleCount > memorySlots) {
    add("memory-capacity-slots", FAIL, "Memory capacity and slots", "The selected kit exceeds the motherboard's listed capacity or slot count.");
  } else {
    add("memory-capacity-slots", PASS, "Memory capacity and slots", "The selected kit fits the example board's capacity and slot count.");
  }

  const memorySpeed = memory?.specs?.speedMts;
  const boardMemorySpeed = board?.specs?.maxMemorySpeedMts;
  if (!hasValue(memorySpeed) || !hasValue(boardMemorySpeed)) {
    unknown("memory-speed", "Memory speed", "The memory kit or motherboard speed limit is missing from the example specs.");
  } else if (memorySpeed > boardMemorySpeed) {
    add("memory-speed", WARNING, "Memory speed", "The kit is rated above the board's listed speed; it may run at a lower default speed or need a memory profile.");
  } else {
    add("memory-speed", PASS, "Memory speed", "The kit's rated speed is within the example board limit.");
  }

  compare(
    "motherboard-case-form",
    "Motherboard and case size",
    board?.specs?.form,
    pcCase?.specs?.boardSizes,
    (form, supportedForms) => form === "unknown" || supportedForms === "unknown"
      ? "The board size or case support list is missing."
      : Array.isArray(supportedForms) && supportedForms.includes(form)
        ? "The case lists support for " + form + "."
        : "The case's listed sizes do not include " + form + ".",
    (form, supportedForms) => Array.isArray(supportedForms) && supportedForms.includes(form)
  );

  if (gpu) {
    const gpuLength = gpu.specs?.length;
    const caseGpuLength = pcCase?.specs?.maxGpuLength;
    if (!hasValue(gpuLength) || !hasValue(caseGpuLength)) {
      unknown("gpu-length", "Graphics card length", "The GPU length or case clearance is missing.");
    } else if (gpuLength > caseGpuLength) {
      add("gpu-length", FAIL, "Graphics card length", "The card is " + gpuLength + " mm long; the case lists " + caseGpuLength + " mm clearance.");
    } else {
      add("gpu-length", PASS, "Graphics card length", "The card fits within the example case's listed length clearance.");
    }

    const gpuThickness = gpu.specs?.thicknessSlots;
    const caseGpuSlots = pcCase?.specs?.maxGpuSlots;
    if (!hasValue(gpuThickness) || !hasValue(caseGpuSlots)) {
      unknown("gpu-thickness", "Graphics card thickness", "GPU thickness or the case's expansion-slot clearance is missing.");
    } else if (gpuThickness > caseGpuSlots) {
      add("gpu-thickness", FAIL, "Graphics card thickness", "The card occupies " + gpuThickness + " slots; the case lists " + caseGpuSlots + " slots of clearance.");
    } else {
      add("gpu-thickness", PASS, "Graphics card thickness", "The card fits within the example case's listed slot clearance.");
    }

    const gpuInterface = gpu.specs?.interface;
    const boardInterfaces = board?.specs?.pcieSlots;
    if (!hasValue(gpuInterface) || !Array.isArray(boardInterfaces)) {
      unknown("gpu-board-interface", "Graphics card interface", "The GPU interface or motherboard slot data is missing.");
    } else if (!boardInterfaces.includes(gpuInterface)) {
      add("gpu-board-interface", FAIL, "Graphics card interface", "The motherboard does not list a matching " + gpuInterface + " slot.");
    } else {
      add("gpu-board-interface", PASS, "Graphics card interface", "The motherboard lists a matching " + gpuInterface + " slot.");
    }
  } else if (requirements.requiresDedicatedGpu) {
    add("required-dedicated-gpu", FAIL, "Dedicated graphics requirement", "This workload requires a dedicated graphics card, but none is selected.");
  } else if (cpu?.specs?.integratedGraphics === true) {
    add("integrated-graphics", PASS, "Display output", "The example CPU lists integrated graphics for a build without a dedicated card.");
  } else if (cpu?.specs?.integratedGraphics === false) {
    add("integrated-graphics", FAIL, "Display output", "The CPU example does not list integrated graphics and no dedicated card is selected.");
  } else {
    unknown("integrated-graphics", "Display output", "No graphics card is selected and integrated graphics support is not recorded.");
  }

  if (cpu && cooler) {
    const sockets = cooler.specs?.sockets;
    const cpuSocket = cpu.specs?.socket;
    if (!Array.isArray(sockets) || !hasValue(cpuSocket)) {
      unknown("cooler-socket", "Cooler mounting", "Cooler mounting sockets or CPU socket data is missing.");
    } else if (!sockets.includes(cpuSocket)) {
      add("cooler-socket", FAIL, "Cooler mounting", "The cooler does not list support for the selected " + cpuSocket + " socket.");
    } else {
      add("cooler-socket", PASS, "Cooler mounting", "The cooler lists support for " + cpuSocket + ".");
    }

    const coolerCapacity = cooler.specs?.maxTdp;
    const cpuWatts = cpu.specs?.watts;
    if (!hasValue(coolerCapacity) || !hasValue(cpuWatts)) {
      unknown("cooler-capacity", "Cooler capacity", "The cooler rating or CPU power data is missing.");
    } else if (coolerCapacity < cpuWatts) {
      add("cooler-capacity", WARNING, "Cooler capacity", "The example cooler is rated for " + coolerCapacity + " W; the CPU is rated at " + cpuWatts + " W.");
    } else {
      add("cooler-capacity", PASS, "Cooler capacity", "The cooler's illustrative rating meets the CPU's listed power.");
    }

    const radiatorSize = cooler.specs?.radiatorSizeMm;
    if (!hasValue(radiatorSize)) {
      unknown("cooler-case-fit", "Cooler and case fit", "Cooler height or radiator size is not recorded.");
    } else if (radiatorSize > 0) {
      const radiatorSupport = pcCase?.specs?.radiatorSupportMm;
      if (!Array.isArray(radiatorSupport)) unknown("cooler-case-fit", "Cooler and case fit", "The case's radiator support list is missing.");
      else if (!radiatorSupport.includes(radiatorSize)) add("cooler-case-fit", FAIL, "Cooler and case fit", "The case does not list support for a " + radiatorSize + " mm radiator.");
      else add("cooler-case-fit", PASS, "Cooler and case fit", "The case lists support for the cooler's radiator size.");
    } else {
      const coolerHeight = cooler.specs?.heightMm;
      const maximumHeight = pcCase?.specs?.maxCoolerHeightMm;
      if (!hasValue(coolerHeight) || !hasValue(maximumHeight)) unknown("cooler-case-fit", "Cooler and case fit", "Cooler height or case height clearance is missing.");
      else if (coolerHeight > maximumHeight) add("cooler-case-fit", FAIL, "Cooler and case fit", "The cooler is " + coolerHeight + " mm high; the case lists " + maximumHeight + " mm clearance.");
      else add("cooler-case-fit", PASS, "Cooler and case fit", "The cooler fits within the example case's listed height clearance.");
    }

    const ramClearance = cooler.specs?.ramClearanceMm;
    const ramHeight = memory?.specs?.heightMm;
    if (!hasValue(ramClearance) || !hasValue(ramHeight)) unknown("cooler-memory-clearance", "Cooler and memory clearance", "Cooler RAM clearance or memory height is missing.");
    else if (ramHeight > ramClearance) add("cooler-memory-clearance", FAIL, "Cooler and memory clearance", "The memory is " + ramHeight + " mm high; cooler clearance is " + ramClearance + " mm.");
    else add("cooler-memory-clearance", PASS, "Cooler and memory clearance", "The memory fits within the cooler's listed clearance.");
  } else {
    unknown("cooler-selection", "CPU cooler", "A compatible cooler is not selected or is missing from the catalogue.");
  }

  if (storage) {
    const storageInterface = storage.specs?.interface;
    const formFactor = storage.specs?.formFactor;
    const generation = storage.specs?.pcieGeneration;
    const slots = board?.specs?.m2Slots;
    if (!hasValue(storageInterface) || !hasValue(formFactor) || !Array.isArray(slots)) {
      unknown("storage-interface", "Storage interface and fit", "Storage interface/form factor or motherboard storage-slot data is missing.");
    } else {
      const matchingSlots = slots.filter(slot =>
        Array.isArray(slot.interfaces) && slot.interfaces.includes(storageInterface)
        && Array.isArray(slot.formFactors) && slot.formFactors.includes(formFactor)
      );
      if (matchingSlots.length === 0) {
        add("storage-interface", FAIL, "Storage interface and fit", "The motherboard does not list a slot for this storage interface and form factor.");
      } else if (!hasValue(generation)) {
        unknown("storage-interface", "Storage interface and fit", "The storage PCIe generation is missing.");
      } else if (matchingSlots.some(slot => Array.isArray(slot.pcieGenerations) && slot.pcieGenerations.includes(generation))) {
        add("storage-interface", PASS, "Storage interface and fit", "A listed motherboard slot supports this storage interface, form factor, and generation.");
      } else if (matchingSlots.some(slot => !Array.isArray(slot.pcieGenerations))) {
        unknown("storage-interface", "Storage interface and fit", "The slot interface and form factor match, but the motherboard's PCIe generation support is missing.");
      } else {
        add("storage-interface", WARNING, "Storage interface and fit", "The drive may run below its rated PCIe generation on the listed motherboard slots.");
      }
    }
  } else {
    add("storage-required", FAIL, "System storage", "No storage device is selected.");
  }

  if (cpu && power) {
    const cpuWatts = cpu.specs?.watts;
    const gpuWatts = gpu?.specs?.watts ?? 0;
    const powerWatts = power.specs?.watts;
    if (!hasValue(cpuWatts) || (gpu && !hasValue(gpu.specs?.watts)) || !hasValue(powerWatts)) {
      unknown("psu-capacity", "Power supply headroom", "CPU, graphics card, or power supply wattage data is missing.");
    } else {
      const target = Math.ceil((cpuWatts + gpuWatts + 150) * 1.3 / 50) * 50;
      if (powerWatts < target) add("psu-capacity", WARNING, "Power supply headroom", "The example parts suggest a " + target + " W supply for illustrative headroom; the selected unit is " + powerWatts + " W.");
      else add("psu-capacity", PASS, "Power supply headroom", "The selected supply meets the example headroom estimate of " + target + " W.");
    }
  } else {
    unknown("psu-capacity", "Power supply headroom", "CPU or power supply data is missing.");
  }

  if (gpu) {
    const requiredConnectors = gpu.specs?.powerConnectors;
    const suppliedConnectors = power?.specs?.connectors;
    if (!Array.isArray(requiredConnectors) || !Array.isArray(suppliedConnectors)) {
      unknown("gpu-power-connectors", "Graphics power connectors", "GPU connector requirements or PSU connector data is missing.");
    } else {
      const missingConnectors = requiredConnectors.filter(connector => !suppliedConnectors.includes(connector));
      if (missingConnectors.length) add("gpu-power-connectors", FAIL, "Graphics power connectors", "The PSU does not list " + missingConnectors.join(", ") + ".");
      else add("gpu-power-connectors", PASS, "Graphics power connectors", "The PSU lists the GPU's required power connectors.");
    }
  } else {
    add("gpu-power-connectors", NOT_APPLICABLE, "Graphics power connectors", "No dedicated GPU is selected.");
  }

  const requiredBoardConnectors = board?.specs?.requiredPsuConnectors;
  const availablePsuConnectors = power?.specs?.connectors;
  if (!Array.isArray(requiredBoardConnectors) || !Array.isArray(availablePsuConnectors)) {
    unknown("board-power-connectors", "Motherboard power connectors", "Motherboard requirements or PSU connector data is missing.");
  } else {
    const missingConnectors = requiredBoardConnectors.filter(connector => !availablePsuConnectors.includes(connector));
    if (missingConnectors.length) add("board-power-connectors", FAIL, "Motherboard power connectors", "The PSU does not list " + missingConnectors.join(", ") + ".");
    else add("board-power-connectors", PASS, "Motherboard power connectors", "The PSU lists the motherboard's required power connectors.");
  }

  const psuForm = power?.specs?.formFactor;
  const casePsuFormats = pcCase?.specs?.psuFormats;
  if (!hasValue(psuForm) || !Array.isArray(casePsuFormats)) {
    unknown("psu-case-fit", "Power supply and case size", "The PSU form factor or case support list is missing.");
  } else if (!casePsuFormats.includes(psuForm)) {
    add("psu-case-fit", FAIL, "Power supply and case size", "The case does not list support for a " + psuForm + " power supply.");
  } else {
    add("psu-case-fit", PASS, "Power supply and case size", "The case lists support for the selected PSU form factor.");
  }

  const incompatibleCount = checks.filter(check => check.status === FAIL).length;
  const warningCount = checks.filter(check => check.status === WARNING).length;
  const unknownCount = checks.filter(check => check.status === UNKNOWN).length;
  const status = incompatibleCount ? FAIL : warningCount ? WARNING : unknownCount ? UNKNOWN : PASS;
  const issues = checks.filter(check => ![PASS, NOT_APPLICABLE].includes(check.status));
  return { status, checks, issues, incompatibleCount, warningCount, unknownCount };
}

