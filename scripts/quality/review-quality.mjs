import { readFile } from "node:fs/promises";
import { absolute, check, finish, gitOrNull, parseArgs, readJson, repoRoot, report, writeReport } from "./review-common.mjs";

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log("Usage: npm run review:quality -- --baseline <baseline.json> --head <ref> --output <report.json>");
  process.exit(0);
}

const baselinePath = absolute(args.baseline, ".omo/evidence/todo-1/execution-baseline.json");
const output = absolute(args.output, ".omo/evidence/todo-19/review-quality.json");
const checks = [];
const artifacts = [pathRelative(baselinePath), "package.json", ".github/workflows/ci.yml", ".github/workflows/deploy.yml"];

let baseline;
try { baseline = await readJson(baselinePath); } catch { /* reported below */ }
const baseValid = Boolean(baseline && /^[0-9a-f]{40}$/.test(baseline.execution_base_sha));
checks.push(check("execution baseline exists", baseValid, baseValid ? baseline.execution_base_sha : pathRelative(baselinePath)));

const head = gitOrNull(["rev-parse", args.head || "HEAD"]);
if (baseValid) {
  const diffCheck = head ? gitOrNull(["diff", "--check", `${baseline.execution_base_sha}..${head}`]) !== null : false;
  checks.push(check("git diff has no whitespace errors", diffCheck, diffCheck ? "clean" : "git diff --check failed or range unavailable"));
}

let packageJson;
try { packageJson = JSON.parse(await readFile(absolute("package.json"), "utf8")); } catch { /* reported below */ }
const requiredScripts = ["verify", "build:local", "validate:export", "test:e2e", "test:lighthouse", "audit:react", "audit:prod", "preview"];
const scriptsPresent = requiredScripts.every((name) => typeof packageJson?.scripts?.[name] === "string");
checks.push(check("quality command set is complete", scriptsPresent, requiredScripts.filter((name) => typeof packageJson?.scripts?.[name] !== "string").join(", ") || "all required scripts present"));
checks.push(check("static export has no next start guidance", !packageJson?.scripts?.start && !packageJson?.scripts?.["build:run"], "start/build:run are removed"));

const diff = head && baseValid ? gitOrNull(["diff", `${baseline.execution_base_sha}..${head}`]) ?? "" : "";
const suppressions = diff.match(/@ts-(?:ignore|expect-error)|eslint-disable|(?:describe|it|test)\.(?:skip|only)\s*\(/g) ?? [];
checks.push(check("diff contains no quality suppressions or skipped tests", suppressions.length === 0, suppressions.join(", ") || "none"));

const deployWorkflow = await readFile(absolute(".github/workflows/deploy.yml"), "utf8").catch(() => "");
const ciWorkflow = await readFile(absolute(".github/workflows/ci.yml"), "utf8").catch(() => "");
const workflowOrder = deployWorkflow.includes("npm run validate:export") && deployWorkflow.includes("npm run test:e2e") && deployWorkflow.includes("actions/deploy-pages@v4");
checks.push(check("workflow retains ordered verification before Pages deploy", workflowOrder, workflowOrder ? "export/e2e/deploy present" : "workflow gate or deploy action missing"));
checks.push(check("PR workflow is read-only", !ciWorkflow.includes("actions/deploy-pages@"), "ci.yml contains no Pages deployment"));

const result = report(checks, artifacts, { base_sha: baseline?.execution_base_sha ?? null, head_sha: head });
await writeReport(output, result);
finish(result);

function pathRelative(filePath) {
  return filePath.startsWith(repoRoot) ? filePath.slice(repoRoot.length + 1).replaceAll("\\", "/") : filePath;
}
