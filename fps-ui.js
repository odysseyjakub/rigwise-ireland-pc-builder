import { FPS_RESOLUTIONS } from "./fps-estimates.js";

export function fpsPowerReferenceText(gpu) {
  if (!gpu) return "Whole-PC average power is not available for this example build.";
  const reference = Number.isFinite(gpu.averageGamingPowerW)
    ? gpu.averageGamingPowerW + " W average GPU gaming power"
    : Number.isFinite(gpu.specs?.watts)
      ? gpu.specs.watts + " W typical GPU board power"
      : "GPU power reference unavailable";
  return reference + " · whole-PC average power is not published for these exact parts.";
}

export function fpsResultLabel(result) {
  return result?.source === "benchmark"
    ? "Measured benchmark"
    : result?.basis === "aggregate"
      ? "Estimate · review data"
      : result?.basis === "model"
        ? "Estimate · model"
        : "Estimate";
}

export function fpsAverageLabel(results) {
  if (!Array.isArray(results) || !results.length) return "No available results";
  if (results.every(result => result?.source === "benchmark" && result?.basis === "measured")) return "Measured average";
  if (results.every(result => result?.source === "prediction")) return "Estimate";
  return "Mixed-source average";
}

export function renderFpsPowerReference(host, gpu) {
  if (host) host.textContent = fpsPowerReferenceText(gpu);
}

export function renderFpsTable(host, rows) {
  if (!host) return;
  const table = document.createElement("table");
  table.className = "fps-table";
  const head = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const gameHeader = document.createElement("th");
  gameHeader.scope = "col";
  gameHeader.textContent = "Game";
  headerRow.append(gameHeader);
  FPS_RESOLUTIONS.forEach(resolution => {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.textContent = resolution;
    headerRow.append(cell);
  });
  head.append(headerRow);

  const body = document.createElement("tbody");
  rows.forEach(game => {
    const row = document.createElement("tr");
    const title = document.createElement("th");
    title.scope = "row";
    const sourceUrl = game.resolutions.find(result => result.sourceUrl)?.sourceUrl || "https://fpshq.com/games/" + encodeURIComponent(game.slug) + "/";
    const sourceLink = document.createElement("a");
    sourceLink.href = sourceUrl;
    sourceLink.target = "_blank";
    sourceLink.rel = "noreferrer";
    sourceLink.textContent = game.name;
    title.append(sourceLink);
    row.append(title);
    game.resolutions.forEach(result => {
      const cell = document.createElement("td");
      if (result.status !== "available") {
        cell.className = "fps-unavailable";
        cell.textContent = "Unavailable";
      } else {
        const score = document.createElement("strong");
        score.textContent = Math.round(result.fps) + " FPS";
        const label = document.createElement("small");
        label.textContent = fpsResultLabel(result);
        cell.append(score, label);
        if (result.minimum !== null && result.maximum !== null && result.minimum !== result.maximum) {
          const range = document.createElement("small");
          range.textContent = Math.round(result.minimum) + "–" + Math.round(result.maximum) + " range";
          cell.append(range);
        }
      }
      row.append(cell);
    });
    body.append(row);
  });

  const footer = document.createElement("tfoot");
  const averageRow = document.createElement("tr");
  averageRow.className = "fps-average-row";
  const averageHeading = document.createElement("th");
  averageHeading.scope = "row";
  averageHeading.textContent = "Selected-game average";
  averageRow.append(averageHeading);
  FPS_RESOLUTIONS.forEach(resolution => {
    const available = rows
      .map(game => game.resolutions.find(result => result.resolution === resolution))
      .filter(result => result?.status === "available" && Number.isFinite(result.fps));
    const cell = document.createElement("td");
    if (!available.length) {
      cell.className = "fps-unavailable";
      cell.textContent = "Unavailable";
    } else {
      const average = document.createElement("strong");
      average.textContent = Math.round(available.reduce((total, result) => total + result.fps, 0) / available.length) + " FPS";
      const note = document.createElement("small");
      note.textContent = fpsAverageLabel(available) + " across " + available.length + " of " + rows.length + " selected games";
      cell.append(average, note);
    }
    averageRow.append(cell);
  });
  footer.append(averageRow);
  table.append(head, body, footer);
  host.replaceChildren(table);
}
