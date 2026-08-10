import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolvePagesBasePath } from "../../scripts/deploy/resolve-pages-path.mjs";
import { publishAdsTxt } from "../../scripts/deploy/publish-ads-txt.mjs";
import { commitNotionSync } from "../../scripts/notion/commit-sync.mjs";

const temporaryDirectories = [];

function temporaryDirectory() {
  const directory = mkdtempSync(path.join(tmpdir(), "blog-workflow-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("Pages deployment scripts", () => {
  it("uses the root path for an owner Pages repository", () => {
    const basePath = resolvePagesBasePath("ralguswls13.github.io", "ralguswls13", "false");

    expect(basePath).toBe("ROOT");
  });

  it("uses the repository name for a project Pages repository", () => {
    const basePath = resolvePagesBasePath("blog", "ralguswls13", "false");

    expect(basePath).toBe("/blog");
  });

  it("publishes a configured AdSense file", () => {
    const outputDirectory = temporaryDirectory();

    publishAdsTxt(outputDirectory, "ca-pub-1234");

    expect(readFileSync(path.join(outputDirectory, "ads.txt"), "utf8")).toBe(
      "google.com, pub-1234, DIRECT, f08c47fec0942fa0\n",
    );
  });

  it("skips the AdSense file when no account is configured", () => {
    const outputDirectory = temporaryDirectory();

    publishAdsTxt(outputDirectory, "");

    expect(existsSync(path.join(outputDirectory, "ads.txt"))).toBe(false);
  });
});

describe("Notion sync commit script", () => {
  it("commits and pushes changed static content once", () => {
    const root = temporaryDirectory();
    const remote = path.join(root, "remote.git");
    const worktree = path.join(root, "worktree");
    execFileSync("git", ["init", "--bare", remote]);
    execFileSync("git", ["clone", remote, worktree]);
    execFileSync("git", ["config", "user.name", "fixture"], { cwd: worktree });
    execFileSync("git", ["config", "user.email", "fixture@example.com"], { cwd: worktree });
    mkdirSync(path.join(worktree, "src", "content"), { recursive: true });
    mkdirSync(path.join(worktree, "src", "data"), { recursive: true });
    mkdirSync(path.join(worktree, "public", "images"), { recursive: true });
    writeFileSync(path.join(worktree, "src", "content", "entry.mdx"), "before\n");
    writeFileSync(path.join(worktree, "src", "data", "index.json"), "{}\n");
    writeFileSync(path.join(worktree, "public", "images", "fixture.txt"), "fixture\n");
    execFileSync("git", ["add", "."], { cwd: worktree });
    execFileSync("git", ["commit", "-m", "fixture"], { cwd: worktree });
    execFileSync("git", ["push", "origin", "HEAD:main"], { cwd: worktree });
    writeFileSync(path.join(worktree, "src", "content", "entry.mdx"), "after\n");

    const firstResult = commitNotionSync(worktree);
    const secondResult = commitNotionSync(worktree);

    expect(firstResult).toBe(true);
    expect(secondResult).toBe(false);
    expect(execFileSync("git", ["show", "main:src/content/entry.mdx"], { cwd: remote, encoding: "utf8" })).toBe(
      "after\n",
    );
  }, 15_000);
});
