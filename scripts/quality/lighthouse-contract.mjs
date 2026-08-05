const categories = ["performance", "accessibility", "best-practices", "seo"];

function median(values) {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[1];
}
export function evaluateLighthouseRuns(runs) {
  if (runs.length !== 3) {
    throw new RangeError(`Lighthouse requires exactly 3 runs, received ${runs.length}`);
  }

  const medians = Object.fromEntries(
    categories.map((category) => [
      category,
      median(runs.map((run) => run[category])),
    ]),
  );
  const failures = categories
    .filter((category) => medians[category] !== 100)
    .map((category) => `${category} median was ${medians[category]}, expected 100`);

  return { passed: failures.length === 0, medians, failures };
}
