import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolvePagesBasePath } from "../../scripts/deploy/resolve-pages-path.mjs";
import { publishAdsTxt } from "../../scripts/deploy/publish-ads-txt.mjs";

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
