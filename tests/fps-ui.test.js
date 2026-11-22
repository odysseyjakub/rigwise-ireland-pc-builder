import test from "node:test";
import assert from "node:assert/strict";
import { fpsAverageLabel, fpsPowerReferenceText, fpsResultLabel, renderFpsTable } from "../fps-ui.js";

function fakeElement(tagName) {
  return {
    tagName,
    children: [],
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; }
  };
}

test("FPS labels keep measured, aggregate and model sources distinct", () => {
  assert.equal(fpsResultLabel({ source: "benchmark", basis: "measured" }), "Measured benchmark");
  assert.equal(fpsResultLabel({ source: "prediction", basis: "aggregate" }), "Estimate · review data");
  assert.equal(fpsResultLabel({ source: "prediction", basis: "model" }), "Estimate · model");
  assert.equal(fpsAverageLabel([{ source: "benchmark", basis: "measured" }]), "Measured average");
  assert.equal(fpsAverageLabel([{ source: "prediction", basis: "aggregate" }]), "Estimate");
  assert.equal(fpsAverageLabel([{ source: "benchmark", basis: "measured" }, { source: "prediction", basis: "model" }]), "Mixed-source average");
});

test("power reference clearly separates GPU power from whole-PC power", () => {
  assert.match(fpsPowerReferenceText({ averageGamingPowerW: 110 }), /110 W average GPU gaming power.*whole-PC average power is not published/);
  assert.match(fpsPowerReferenceText({ specs: { watts: 165 } }), /165 W typical GPU board power.*whole-PC average power is not published/);
  assert.match(fpsPowerReferenceText(null), /Whole-PC average power is not available/);
});

test("FPS table calculates per-resolution means from available selected games only", () => {
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: fakeElement };
  try {
    const host = fakeElement("host");
    renderFpsTable(host, [
      { name: "Game A", slug: "game-a", resolutions: [
        { resolution: "1080p", status: "available", fps: 100, source: "prediction", basis: "aggregate", minimum: 100, maximum: 100 },
        { resolution: "1440p", status: "unavailable" },
        { resolution: "4K", status: "available", fps: 40, source: "prediction", basis: "model", minimum: 40, maximum: 40 }
      ] },
      { name: "Game B", slug: "game-b", resolutions: [
        { resolution: "1080p", status: "available", fps: 140, source: "prediction", basis: "aggregate", minimum: 140, maximum: 140 },
        { resolution: "1440p", status: "available", fps: 70, source: "prediction", basis: "aggregate", minimum: 70, maximum: 70 },
        { resolution: "4K", status: "unavailable" }
      ] }
    ]);
    const table = host.children[0];
    const footer = table.children[2];
    const averageCells = footer.children[0].children.slice(1);
    assert.equal(averageCells[0].children[0].textContent, "120 FPS");
    assert.equal(averageCells[0].children[1].textContent, "Estimate across 2 of 2 selected games");
    assert.equal(averageCells[1].children[0].textContent, "70 FPS");
    assert.equal(averageCells[1].children[1].textContent, "Estimate across 1 of 2 selected games");
    assert.equal(averageCells[2].children[0].textContent, "40 FPS");
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
