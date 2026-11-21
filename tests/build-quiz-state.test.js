import test from "node:test";
import assert from "node:assert/strict";
import { createQuizBuilderQuery, readQuizPreferences } from "../build-quiz-state.js";

test("questionnaire preferences round-trip into builder-safe settings", () => {
  const query = createQuizBuilderQuery({
    budget: 2450,
    workload: "gaming",
    targetResolution: "1440p",
    targetFrameRate: 120,
    sizePreference: "compact",
    storagePreference: "2tb",
    strategy: "fewest",
    accessories: ["monitor", "keyboard"],
    designPreference: "aesthetics",
    gameSlugs: ["fortnite", "cs2"],
    creativeApps: ["video", "3d"]
  });
  assert.deepEqual(readQuizPreferences("?" + query), {
    budget: 2450,
    workload: "gaming",
    targetResolution: "1440p",
    targetFrameRate: 120,
    sizePreference: "compact",
    storagePreference: "2tb",
    strategy: "fewest",
    designPreference: "aesthetics",
    gameSlugs: ["fortnite", "cs2"],
    creativeApps: ["video", "3d"],
    accessories: ["keyboard", "monitor"]
  });
});

test("questionnaire preferences reject malformed or out-of-range query strings", () => {
  assert.equal(readQuizPreferences("?source=other&budget=1000"), null);
  assert.equal(readQuizPreferences("?source=quiz&budget=350&workload=gaming&resolution=1080p&fps=60&size=any&storage=1tb&strategy=lowest"), null);
  assert.equal(readQuizPreferences("?source=quiz&budget=725&workload=gaming&resolution=1080p&fps=60&size=any"), null);
  assert.equal(readQuizPreferences("?source=quiz&budget=6000&workload=gaming&resolution=1080p&fps=60&size=any"), null);
  assert.equal(readQuizPreferences("?source=quiz&budget=1000&workload=unknown&resolution=1080p&fps=60&size=any"), null);
  assert.equal(readQuizPreferences("?source=quiz&budget=1000&workload=gaming&resolution=8k&fps=60&size=any"), null);
  assert.equal(readQuizPreferences("?source=quiz&budget=1000&workload=gaming&resolution=1080p&fps=90&size=any"), null);
  assert.equal(readQuizPreferences("?source=quiz&budget=1000&workload=gaming&resolution=1080p&fps=60&size=any&storage=1tb&strategy=lowest&peripherals=keyboard,unknown"), null);
  assert.equal(readQuizPreferences("?source=quiz&budget=1000&workload=gaming&resolution=1080p&fps=60&size=any&storage=1tb&strategy=lowest&games=obscure-game"), null);
});

