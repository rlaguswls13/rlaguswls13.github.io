import path from "node:path";
import { absolute, check, finish, filesIn, parseArgs, readJson, report, writeReport } from "./review-common.mjs";

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log("Usage: npm run review:manual -- --baseline <baseline.json> --evidence <browser-artifacts> --output <report.json>");
  process.exit(0);
}

const evidence = absolute(args.evidence, ".omo/evidence/todo-17");
const baselinePath = absolute(args.baseline, ".omo/evidence/todo-1/execution-baseline.json");
const output = absolute(args.output, ".omo/evidence/todo-19/review-manual.json");
const checks = [];
const artifacts = [relative(baselinePath), relative(path.join(evidence, "screenshots")), relative(path.join(evidence, "axe")), relative(path.join(evidence, "lighthouse", "summary.json")), relative(path.join(evidence, "cleanup-final.json"))];

let baseline;
try { baseline = await readJson(baselinePath); } catch { /* reported below */ }
checks.push(check("Todo 1 baseline is available", Boolean(/^[0-9a-f]{40}$/.test(baseline?.execution_base_sha)), baseline?.execution_base_sha ?? relative(baselinePath)));

const screenshotFiles = (await filesIn(path.join(evidence, "screenshots"))).filter((file) => /\.(png|webp|jpg)$/i.test(file));
const axeFiles = (await filesIn(path.join(evidence, "axe"))).filter((file) => file.endsWith(".json"));
let axeFailures = 0;
for (const file of axeFiles) {
  try {
    const value = await readJson(file);
    axeFailures += Array.isArray(value.violations) ? value.violations.filter((violation) => ["critical", "serious"].includes(violation.impact)).length : Number(value.blockingViolations?.length ?? 0);
  } catch { axeFailures += 1; }
}
if (axeFiles.length > 0) checks.push(check("axe has no critical/serious violations", axeFailures === 0, `${axeFiles.length}/36 reports; ${axeFailures} blockers`));

const lighthousePath = path.join(evidence, "lighthouse", "summary.json");
let lighthouse;
try { lighthouse = await readJson(lighthousePath); } catch { /* reported below */ }
const lighthouseMatrices = Array.isArray(lighthouse?.matrix) ? lighthouse.matrix : [];
const matrixComplete = screenshotFiles.length === 36 && axeFiles.length === 36 && lighthouseMatrices.length === 12;
checks.push(check("browser evidence matrix is complete", matrixComplete, `${screenshotFiles.length}/36 screenshots, ${axeFiles.length}/36 axe reports, ${lighthouseMatrices.length}/12 Lighthouse matrices`));
const lighthouseFailures = lighthouseMatrices.filter((matrix) => matrix.passed !== true).length;
if (lighthouseMatrices.length > 0) checks.push(check("Lighthouse three-run matrix meets exact 100 thresholds", lighthouseFailures === 0, `${lighthouseMatrices.length}/12 matrices; ${lighthouseFailures} failed`));

let cleanup;
try { cleanup = await readJson(path.join(evidence, "cleanup-final.json")); } catch { /* reported below */ }
const cleanupPass = cleanup?.previewStopped === true && cleanup?.port3000Free === true && cleanup?.playwrightContextsClosed === true;
checks.push(check("manual QA cleanup receipt is complete", cleanupPass, cleanupPass ? "preview, port, and browser contexts closed" : "cleanup-final.json missing or incomplete"));

const result = report(checks, artifacts, { route_count: 6, screenshot_count: screenshotFiles.length, axe_report_count: axeFiles.length });
await writeReport(output, result);
finish(result);

function relative(filePath) {
  return path.relative(process.cwd(), filePath).replaceAll("\\", "/");
}
