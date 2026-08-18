import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MEMORY_PATH = path.join("wiki", "session-memory.md");
const HANDOFF_PATH = path.join(".agent", "session-handoff.md");
const COMMIT_PATHS = Object.freeze(["project/skills", "project/hooks"]);
const HANDOFF_STATUSES = Object.freeze(["empty", "active", "blocked", "ready"]);

function redact(value) {
  return String(value || "")
    .replace(/(notion[_-]?token|giscus[_-]?github[_-]?token|password|secret|api[_-]?key)\s*[:=]\s*[^\s,;]+/giu, "$1=[REDACTED]")
    .replace(/\b(?:ghp|github_pat)_[A-Za-z0-9_]+\b/gu, "[REDACTED_TOKEN]")
    .trim();
}

function lines(value, limit = 8) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => redact(entry)).filter(Boolean).slice(0, limit);
}

function eventText(event) {
  const summary = redact(event.summary).slice(0, 1200);
  const decisions = lines(event.decisions);
  const verification = lines(event.verification);
  const risks = lines(event.risks);
  const changedFiles = lines(event.changed_files, 20);
  const sections = [
    `## ${new Date().toISOString()} | ${redact(event.session_id || "local")}`,
    summary ? `\n### Summary\n${summary}` : "",
    decisions.length ? `\n### Decisions\n${decisions.map((item) => `- ${item}`).join("\n")}` : "",
    verification.length ? `\n### Verification\n${verification.map((item) => `- ${item}`).join("\n")}` : "",
    risks.length ? `\n### Risks\n${risks.map((item) => `- ${item}`).join("\n")}` : "",
    changedFiles.length ? `\n### Changed project surfaces\n${changedFiles.map((item) => `- \`${item}\``).join("\n")}` : "",
  ];
  return `${sections.filter(Boolean).join("\n")}\n`;
}

function repositoryRoot(start = process.cwd()) {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: start, encoding: "utf8" }).trim();
}

export function readSessionHandoff(root) {
  const handoffPath = path.join(root, HANDOFF_PATH);
  const relativePath = HANDOFF_PATH.replaceAll("\\", "/");
  if (!fs.existsSync(handoffPath)) {
    return {
      path: relativePath,
      exists: false,
      recorded: false,
      status: "missing",
      requestFinalWiki: false,
      requestPrReview: false,
    };
  }

  const contents = fs.readFileSync(handoffPath, "utf8");
  const status = contents.match(/^status:\s*(\w+)\s*$/mu)?.[1] || "invalid";
  const recorded = HANDOFF_STATUSES.includes(status) && status !== "empty";
  return {
    path: relativePath,
    exists: true,
    recorded,
    status,
    requestFinalWiki: recorded,
    requestPrReview: recorded,
  };
}

export function updateMemoryWiki(root, event) {
  const entry = eventText(event);
  const memoryPath = path.join(root, MEMORY_PATH);
  fs.mkdirSync(path.dirname(memoryPath), { recursive: true });
  const current = fs.existsSync(memoryPath) ? fs.readFileSync(memoryPath, "utf8") : "# Session Memory\n\n";
  fs.writeFileSync(memoryPath, `${current.trimEnd()}\n\n${entry}`, "utf8");
  return path.relative(root, memoryPath).replaceAll("\\", "/");
}

export function commitProjectMemory(root, event) {
  if (event.commit === false) return { committed: false, reason: "disabled" };
  const existingPaths = COMMIT_PATHS.filter((relativePath) => fs.existsSync(path.join(root, relativePath)));
  if (existingPaths.length === 0) return { committed: false, reason: "no project paths" };
  execFileSync("git", ["add", "--", ...existingPaths], { cwd: root, stdio: "inherit" });
  const diff = spawnSync("git", ["diff", "--cached", "--quiet", "--", ...existingPaths], { cwd: root, stdio: "ignore" });
  if (diff.status === 0) return { committed: false, reason: "no scoped changes" };
  if (diff.status !== 1) throw diff.error || new Error(`git diff failed with exit code ${diff.status}.`);
  const messageId = redact(event.session_id || "local").replace(/[^a-z0-9._-]/giu, "-").slice(0, 48) || "local";
  execFileSync("git", ["commit", "--only", "-m", `chore(agent): record session memory ${messageId}`, "--", ...existingPaths], { cwd: root, stdio: "inherit" });
  return { committed: true };
}

export async function runSessionEndHook({ root = repositoryRoot(), event } = {}) {
  if (!event || (event.type && event.type !== "session_end")) return { updated: false, committed: false, reason: "not-session-end" };
  const handoff = readSessionHandoff(root);
  const hasMemory = [event.summary, ...(event.decisions || []), ...(event.verification || []), ...(event.risks || [])].some(Boolean);
  if (!hasMemory) return { updated: false, committed: false, reason: "empty-memory", handoff };
  const memoryPath = updateMemoryWiki(root, event);
  const commit = commitProjectMemory(root, event);
  return { updated: true, memoryPath, ...commit, handoff };
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8").trim();
}

if (path.resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  try {
    const serialized = await readStdin();
    const event = serialized ? JSON.parse(serialized) : null;
    const result = await runSessionEndHook({ event });
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(`[session-end] ${error instanceof Error ? error.message : "unknown failure"}`);
    process.exitCode = 1;
  }
}
