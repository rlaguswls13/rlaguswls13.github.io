import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = path.join(REPO_ROOT, "scripts/notion/transfer/build-devlog-index.mjs");
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
  return JSON.parse(await readFile(path.join(root, "src/data/indexes/devlog.json"), "utf8"));
}

afterEach(async () => {
  await Promise.all(fixtureRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })));
});

describe("build devlog index", () => {
  it("keeps a category present with an empty list when every entry is temp", async () => {
    // Given
    const root = await mkdtemp(path.join(tmpdir(), "blog-devlog-index-"));
    fixtureRoots.push(root);
    await writeMdx(
      root,
      "src/content/devlog/tech_study/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.mdx",
      'id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"\nslug: "temp-post"\ntitle: "Temp post"\ndate: "2026-01-01"\nstatus: "temp"',
    );

    // When
    runGenerator(root);
    const output = await readIndex(root);

    // Then
    expect(output).toEqual({ tech_study: [] });
  });

  it("omits a category directory that exists but holds no publishable-or-otherwise MDX", async () => {
    // Given
    const root = await mkdtemp(path.join(tmpdir(), "blog-devlog-index-"));
    fixtureRoots.push(root);
    await writeMdx(
      root,
      "src/content/devlog/tech_study/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.mdx",
      'id: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"\nslug: "published-post"\ntitle: "Published post"\ndate: "2026-01-01"',
    );
    await mkdir(path.join(root, "src/content/devlog/problem_solving"), { recursive: true });
    await writeMdx(
      root,
      "src/content/devlog/competition_event/.notion-backup-12345678-1234-4123-8123-123456789abc-x.mdx",
      'id: "backup"\nslug: "backup"\ntitle: "Backup"\ndate: "2026-01-01"',
    );

    // When
    runGenerator(root);
    const output = await readIndex(root);

    // Then
    expect(Object.keys(output)).toEqual(["tech_study"]);
    expect(output.tech_study).toHaveLength(1);
  });

  it("ignores a directory that is not one of the canonical devlog categories", async () => {
    // Given
    const root = await mkdtemp(path.join(tmpdir(), "blog-devlog-index-"));
    fixtureRoots.push(root);
    await writeMdx(
      root,
      "src/content/devlog/misc/cccccccccccccccccccccccccccccccc.mdx",
      'id: "cccccccccccccccccccccccccccccccc"\nslug: "stray-post"\ntitle: "Stray post"\ndate: "2026-01-01"\nstatus: "temp"',
    );

    // When
    runGenerator(root);
    const output = await readIndex(root);

    // Then
    expect(output).toEqual({});
  });

  it("derives the category from the first path segment for nested subcategory files", async () => {
    // Given
    const root = await mkdtemp(path.join(tmpdir(), "blog-devlog-index-"));
    fixtureRoots.push(root);
    await writeMdx(
      root,
      "src/content/devlog/competition_event/event/dddddddddddddddddddddddddddddddd.mdx",
      'id: "dddddddddddddddddddddddddddddddd"\nslug: "temp-nested-post"\ntitle: "Temp nested post"\ndate: "2026-01-01"\nstatus: "temp"',
    );

    // When
    runGenerator(root);
    const output = await readIndex(root);

    // Then
    expect(output).toEqual({ competition_event: [] });
  });
});
