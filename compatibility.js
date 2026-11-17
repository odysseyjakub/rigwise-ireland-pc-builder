export function checkCompatibility({ components, products }) {
  const byBuildId = Object.fromEntries(components.map(component => [component.id, products.find(product => product.id === component.productId)]));
  const issues = [];
  const cpu = byBuildId.cpu;
  const board = byBuildId.motherboard;
  const memory = byBuildId.memory;
  const graphics = byBuildId.graphics;
  const power = byBuildId.power;
  const pcCase = byBuildId.case;
  const cooler = byBuildId.cooler;

  if (cpu && board && cpu.specs.socket !== board.specs.socket) {
    issues.push({ severity: "error", title: "Processor socket mismatch", detail: cpu.specs.socket + " and " + board.specs.socket + " sockets do not match." });
  }
  if (board && memory && board.specs.memoryGen !== memory.specs.memoryGen) {
    issues.push({ severity: "error", title: "Memory generation mismatch", detail: "This motherboard supports " + board.specs.memoryGen + "; the selected kit is " + memory.specs.memoryGen + "." });
  }
  if (cpu && cooler && !cooler.specs.sockets.includes(cpu.specs.socket)) {
    issues.push({ severity: "error", title: "Cooler mounting mismatch", detail: "This cooler does not list support for the selected " + cpu.specs.socket + " socket." });
  }
  if (cpu && cooler && cooler.specs.maxTdp < cpu.specs.watts) {
    issues.push({ severity: "warning", title: "Cooler capacity", detail: "The example cooler is rated for " + cooler.specs.maxTdp + " W; the selected processor is rated at " + cpu.specs.watts + " W." });
  }
  if (board && pcCase && !pcCase.specs.boardSizes.includes(board.specs.form)) {
    issues.push({ severity: "error", title: "Motherboard does not fit", detail: pcCase.specs.boardSizes.join(" / ") + " case support does not include " + board.specs.form + "." });
  }
  if (graphics && pcCase && graphics.specs.length > pcCase.specs.maxGpuLength) {
    issues.push({ severity: "error", title: "Graphics card clearance", detail: "The card is " + graphics.specs.length + " mm long; this case allows " + pcCase.specs.maxGpuLength + " mm." });
  }
  if (cpu && graphics && power) {
    const recommendedWatts = Math.ceil((cpu.specs.watts + graphics.specs.watts + 150) * 1.3 / 50) * 50;
    if (power.specs.watts < recommendedWatts) {
      issues.push({ severity: "warning", title: "Check power headroom", detail: "A " + recommendedWatts + " W supply is a safer illustrative target for this combination." });
    }
  }
  return issues;
}
