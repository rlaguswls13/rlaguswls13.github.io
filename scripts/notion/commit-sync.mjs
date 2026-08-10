import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CONTENT_PATHS = ["src/content", "src/data", "public/images"];

export function commitNotionSync(cwd = process.cwd()) {
  execFileSync("git", ["config", "user.name", "github-actions[bot]"], { cwd });
  execFileSync(
    "git",
    ["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"],
    { cwd },
  );
  execFileSync("git", ["add", "--all", "--", ...CONTENT_PATHS], { cwd });

  const diff = spawnSync("git", ["diff", "--cached", "--quiet"], { cwd, stdio: "inherit" });
  if (diff.status === 0) {
    console.log("No Notion content changes.");
    return false;
  }
  if (diff.status !== 1) {
    throw diff.error || new Error(`git diff failed with exit code ${diff.status}.`);
  }

  execFileSync("git", ["commit", "-m", "[FETCH] : Notion 콘텐츠 갱신"], { cwd, stdio: "inherit" });
  execFileSync("git", ["push", "origin", "HEAD:main"], { cwd, stdio: "inherit" });
  return true;
}

if (path.resolve(process.argv[1] || "") === fileURLToPath(import.meta.url)) {
  commitNotionSync();
}
