import { describe, expect, it } from "vitest";

import { evaluateLighthouseRuns } from "../../scripts/quality/lighthouse-contract.mjs";

const perfectRun = {
  performance: 100,
  accessibility: 100,
  "best-practices": 100,
  seo: 100,
};

describe("Lighthouse quality contract", () => {
  it("accepts exactly three perfect cold runs", () => {
    // Given
    const runs = [perfectRun, perfectRun, perfectRun];

    // When
    const result = evaluateLighthouseRuns(runs);

    // Then
    expect(result).toEqual({
      passed: true,
      medians: perfectRun,
      failures: [],
    });
  });

  it("rejects a median score of 99", () => {
    // Given
    const runs = [
      perfectRun,
      { ...perfectRun, performance: 99 },
      { ...perfectRun, performance: 99 },
    ];

    // When
    const result = evaluateLighthouseRuns(runs);

    // Then
    expect(result.passed).toBe(false);
    expect(result.medians.performance).toBe(99);
    expect(result.failures).toEqual(["performance median was 99, expected 100"]);
  });

  it("rejects a run count other than three", () => {
    // Given
    const runs = [perfectRun, perfectRun];

    // When / Then
    expect(() => evaluateLighthouseRuns(runs)).toThrow(/exactly 3 runs/);
  });
});
