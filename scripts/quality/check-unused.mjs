import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

console.log("=== knip: unused files / exports / dependencies (code tree-shaking) ===\n");
const isWindows = process.platform === "win32";
spawnSync(isWindows ? "npx.cmd" : "npx", ["knip", "--no-exit-code"], { cwd: ROOT, stdio: "inherit" });

spawnSync("node", ["scripts/quality/check-unused-assets.mjs"], { cwd: ROOT, stdio: "inherit" });

console.log("Report-only: no files were modified or deleted by this check.");
