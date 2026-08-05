import { readFile } from "node:fs/promises";
import path from "node:path";
import { absolute, check, finish, gitOrNull, parseArgs, readJson, repoRoot, report, writeReport } from "./review-common.mjs";

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log("Usage: npm run review:scope -- --plan <plan.md> --baseline <baseline.json> --head <ref> --owned-hashes <manifest.json> --output <report.json>");
  process.exit(0);
}

const planPath = absolute(args.plan, ".omo/plans/personal-blog-improvement.md");
const baselinePath = absolute(args.baseline, ".omo/evidence/todo-1/execution-baseline.json");
const hashesPath = absolute(args["owned-hashes"], ".omo/evidence/todo-1/owned-roots-before.json");
const output = absolute(args.output, ".omo/evidence/todo-19/review-scope.json");
const checks = [];
const artifacts = [relative(planPath), relative(baselinePath), relative(hashesPath)];

const planText = await readFile(planPath, "utf8").catch(() => "");
checks.push(check("live plan is available and scope constraints are readable", planText.length > 0, planText.length > 0 ? "plan loaded" : relative(planPath)));

let hashes;
try { hashes = await readJson(hashesPath); } catch { /* reported below */ }
const expectedRoots = ["src/content", "src/data", "public/images", "public/thumnail"];
const rootShape = Boolean(hashes && expectedRoots.every((root) => hashes.roots?.[root]?.files));
checks.push(check("owned-root hash manifest is complete", rootShape, rootShape ? expectedRoots.join(", ") : relative(hashesPath)));

const baseline = await readJson(baselinePath).catch(() => null);
const head = gitOrNull(["rev-parse", args.head || "HEAD"]);
const base = baseline?.execution_base_sha;
checks.push(check("execution baseline exists", Boolean(base && /^[0-9a-f]{40}$/.test(base)), base ?? relative(baselinePath)));
const status = gitOrNull(["status", "--short"]) ?? "";
const changedPaths = status.split(/\r?\n/).filter(Boolean).map((line) => line.slice(2).trim().replaceAll("\\", "/").replace(/^"|"$/g, ""));
const allowed = /^(?:\.github\/|src\/|scripts\/|tests\/|docs\/|artifacts\/|public\/|README\.md$|DESIGN\.md$|package\.json$|package-lock\.json$|playwright\.config\.ts$|vitest\.config\.mts$|tsconfig\.json$|eslint\.config\.mjs$|next\.config\.ts$|\.nvmrc$|\.node-version$|\.gitignore$|\.omo\/)/;
const outOfScopePaths = changedPaths.filter((file) => !allowed.test(file) && !file.startsWith("out/") && !file.startsWith(".next/") && !file.startsWith("node_modules/"));
checks.push(check("working tree stays inside Todo19 scope", outOfScopePaths.length === 0, outOfScopePaths.join(", ") || "no out-of-scope paths"));

const diff = base ? gitOrNull(["diff", base]) ?? "" : "";
let currentFile = "";
const additions = [];
for (const line of diff.split(/\r?\n/)) {
  const fileMatch = line.match(/^diff --git a\/(.+) b\//);
  if (fileMatch) currentFile = fileMatch[1];
  if (line.startsWith("+") && !line.startsWith("+++") && !currentFile.endsWith("scripts/quality/review-scope.mjs") && !currentFile.endsWith("scripts/quality/review-quality.mjs")) additions.push(line);
}
const forbiddenDiff = additions.join("\n").match(/React\s*Scan|next start|force[- ]sync|GITHUB_PAT|cross[- ]repository\s+sync/gi) ?? [];
checks.push(check("commit range contains no forbidden migration or deployment artifacts", forbiddenDiff.length === 0, forbiddenDiff.join(", ") || "none"));

const result = report(checks, artifacts, { base_sha: base ?? null, head_sha: head, out_of_scope_paths: outOfScopePaths });
await writeReport(output, result);
finish(result);

function relative(filePath) {
  return path.relative(repoRoot, filePath).replaceAll("\\", "/");
}
