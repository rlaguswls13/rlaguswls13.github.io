import path from "node:path";
import { absolute, check, finish, gitOrNull, nonEmptyDirectory, parseArgs, readJson, repoRoot, report, writeReport } from "./review-common.mjs";

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log("Usage: npm run verify:evidence -- --plan <plan.md> --baseline <baseline.json> --head <ref> --evidence <dir> --output <report.json>");
  process.exit(0);
}

const planPath = absolute(args.plan, ".omo/plans/personal-blog-improvement.md");
const baselinePath = absolute(args.baseline, ".omo/evidence/todo-1/execution-baseline.json");
const suppliedEvidence = absolute(args.evidence, ".omo/evidence");
const evidenceRoot = path.basename(suppliedEvidence).startsWith("todo-") ? path.dirname(suppliedEvidence) : suppliedEvidence;
const output = absolute(args.output, ".omo/evidence/todo-19/verify-evidence.json");
const checks = [];
const artifacts = [path.relative(repoRoot, planPath), path.relative(repoRoot, baselinePath)];

let planText = "";
try {
  planText = await (await import("node:fs/promises")).readFile(planPath, "utf8");
} catch {
  checks.push(check("plan exists", false, path.relative(repoRoot, planPath)));
}

let contractTodos = new Map();
let contractError = "";
if (planText) {
  const block = planText.match(/### Contract map[^\n]*\n([\s\S]*?)\n\n`verify:evidence`/);
  const rows = block ? [...block[1].matchAll(/^\|\s*(C\d+)\s*\|[^|]*\|\s*([^|]+)\|\s*$/gm)] : [];
  const seen = new Set();
  try {
    if (rows.length !== 6) throw new Error(`expected exactly six contract rows, found ${rows.length}`);
    for (const [, id, mapping] of rows) {
      if (seen.has(id)) throw new Error(`duplicate contract ${id}`);
      seen.add(id);
      const todoNumbers = [];
      for (const token of mapping.matchAll(/\b(\d+)(?:\s*-\s*(\d+))?\b/g)) {
        const first = Number(token[1]);
        const last = token[2] ? Number(token[2]) : first;
        if (first < 1 || last > 19 || last < first) throw new Error(`invalid Todo mapping in ${id}`);
        for (let todo = first; todo <= last; todo += 1) todoNumbers.push(todo);
      }
      if (todoNumbers.length === 0) throw new Error(`missing Todo mapping in ${id}`);
      contractTodos.set(id, todoNumbers);
    }
    if (!["C1", "C2", "C3", "C4", "C5", "C6"].every((id) => seen.has(id))) throw new Error("missing contract ID");
    const union = [...new Set([...contractTodos.values()].flat())].sort((a, b) => a - b);
    if (union.length !== 19 || union.some((todo, index) => todo !== index + 1)) throw new Error("contract map must cover Todos 1-19 exactly");
  } catch (error) {
    contractError = error instanceof Error ? error.message : String(error);
  }
}
checks.push(check("contract map parses exactly C1-C6 and maps Todos 1-19", Boolean(planText && !contractError), contractError || "six unique contracts and complete Todo coverage"));

let baseline;
let baselineLoaded = true;
try {
  baseline = await readJson(baselinePath);
} catch {
  baselineLoaded = false;
}
checks.push(check("Todo 1 execution baseline exists", baselineLoaded, path.relative(repoRoot, baselinePath)));
const baselineValid = Boolean(baselineLoaded && baseline && /^[0-9a-f]{40}$/.test(baseline.execution_base_sha) && Array.isArray(baseline.roots));
if (baselineLoaded) checks.push(check("Todo 1 baseline is valid", baselineValid, baselineValid ? baseline.execution_base_sha : "missing full execution_base_sha/roots"));

const head = gitOrNull(["rev-parse", args.head || "HEAD"]);
if (baselineValid) {
  const ancestor = head ? gitOrNull(["merge-base", "--is-ancestor", baseline.execution_base_sha, head]) !== null : false;
  checks.push(check("baseline SHA is in the requested commit range", ancestor, head ? `${baseline.execution_base_sha} -> ${head}` : "head could not be resolved"));
}

if (!contractError) {
  for (const todo of [...new Set([...contractTodos.values()].flat())].sort((a, b) => a - b)) {
    const receipt = path.join(evidenceRoot, `todo-${todo}`);
    const present = await nonEmptyDirectory(receipt);
    checks.push(check(`Todo ${todo} evidence receipt`, present, path.relative(repoRoot, receipt)));
    if (present) artifacts.push(path.relative(repoRoot, receipt));
  }
}

const result = report(checks, artifacts, {
  checked_contracts: contractTodos.size,
  checked_todos: contractError ? 0 : [...new Set([...contractTodos.values()].flat())].length,
});
await writeReport(output, result);
finish(result);
