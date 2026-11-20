import test from "node:test";
import assert from "node:assert/strict";
import { createQuizBuilderQuery, readQuizPreferences } from "../build-quiz-state.js";

test("questionnaire preferences round-trip into builder-safe settings", () => {
  const query = createQuizBuilderQuery({
    budget: 2450,
    workload: "gaming",
    targetResolution: "1440p",
    targetFrameRate: 120,
    sizePreference: "compact"
  });
  assert.deepEqual(readQuizPreferences("?" + query), {
    budget: 2450,
    workload: "gaming",
    targetResolution: "1440p",
    targetFrameRate: 120,
    sizePreference: "compact"
  });
});

test("questionnaire preferences reject malformed or out-of-range query strings", () => {
  assert.equal(readQuizPreferences("?source=other&budget=1000"), null);
  assert.equal(readQuizPreferences("?source=quiz&budget=725&workload=gaming&resolution=1080p&fps=60&size=any"), null);
  assert.equal(readQuizPreferences("?source=quiz&budget=6000&workload=gaming&resolution=1080p&fps=60&size=any"), null);
  assert.equal(readQuizPreferences("?source=quiz&budget=1000&workload=unknown&resolution=1080p&fps=60&size=any"), null);
  assert.equal(readQuizPreferences("?source=quiz&budget=1000&workload=gaming&resolution=8k&fps=60&size=any"), null);
  assert.equal(readQuizPreferences("?source=quiz&budget=1000&workload=gaming&resolution=1080p&fps=90&size=any"), null);
});

