import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(REPO_ROOT, "scripts/notion/transfer/build-journal-index.mjs");
const fixtureRoots = [];

async function writeMdx(root, relativePath, frontmatter) {
  const filePath = path.join(root, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `---\n${frontmatter}\n---\n\nBody.\n`, "utf8");
}

function runGenerator(root) {
  execFileSync(process.execPath, [SCRIPT], { cwd: root, stdio: "pipe" });
}

async function readIndex(root) {
  return JSON.parse(await readFile(path.join(root, "src/data/indexes/journal.json"), "utf8"));
}

afterEach(async () => {
  await Promise.all(fixtureRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })));
});

describe("build journal index", () => {
  it("keeps education present with an empty list when every entry is temp", async () => {
    // Given
    const root = await mkdtemp(path.join(tmpdir(), "blog-journal-index-"));
    fixtureRoots.push(root);
    await writeMdx(
      root,
      "src/content/devlog/education/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.mdx",
      'id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"\nslug: "temp-lesson"\ntitle: "Temp lesson"\ndate: "2026-01-01"\nstatus: "temp"',
    );

    // When
    runGenerator(root);
    const output = await readIndex(root);

    // Then
    expect(output).toEqual({ education: [] });
  });

  it("omits personal and education when neither has any MDX file", async () => {
    // Given
    const root = await mkdtemp(path.join(tmpdir(), "blog-journal-index-"));
    fixtureRoots.push(root);

    // When
    runGenerator(root);
    const output = await readIndex(root);

    // Then
    expect(output).toEqual({});
  });
});
