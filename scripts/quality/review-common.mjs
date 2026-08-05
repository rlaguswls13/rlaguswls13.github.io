import { access, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") args.help = true;
    else if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[index + 1];
      if (next && !next.startsWith("--")) {
        args[key] = next;
        index += 1;
      } else args[key] = true;
    }
  }
  return args;
}

export function absolute(value, fallback) {
  return path.resolve(repoRoot, value || fallback);
}

export async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readJson(filePath) {
  return JSON.parse((await readFile(filePath, "utf8")).replace(/^\uFEFF/, ""));
}

export function git(args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

export function gitOrNull(args) {
  try {
    return git(args);
  } catch {
    return null;
  }
}

export async function filesIn(directory) {
  if (!(await exists(directory))) return [];
  const result = [];
  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const child = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(child);
      else if (entry.isFile()) result.push(child);
    }
  }
  await visit(directory);
  return result.sort();
}

export async function nonEmptyDirectory(directory) {
  if (!(await exists(directory))) return false;
  const entries = await readdir(directory, { withFileTypes: true });
  return entries.length > 0;
}

export async function writeReport(output, report) {
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

export function report(checks, artifacts = [], extra = {}) {
  const blockers = checks.filter((check) => !check.passed);
  return {
    verdict: blockers.length === 0 ? "APPROVE" : "BLOCKED",
    blocker_count: blockers.length,
    checks,
    artifacts,
    ...extra,
  };
}

export function check(name, passed, details = "") {
  return { name, passed: Boolean(passed), details };
}

export function finish(reportValue) {
  if (reportValue.blocker_count > 0) process.exitCode = 1;
}

export async function fileSize(filePath) {
  try {
    return (await stat(filePath)).size;
  } catch {
    return 0;
  }
}
