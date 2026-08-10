import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { mkdtemp } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { validateContent, verifyDeterministicGenerators } from "../../scripts/content/validate-content.mjs";

const fixtureRoots = [];
const id = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

async function writeJson(root, relativePath, value) {
  const filePath = path.join(root, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeMdx(root, relativePath, frontmatter) {
  const filePath = path.join(root, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `---\n${frontmatter}\n---\n\nFixture body.\n`, "utf8");
}

async function createFixture() {
  const root = await mkdtemp(path.join(tmpdir(), "blog-content-validation-"));
  fixtureRoots.push(root);
  await writeMdx(root, `src/content/devlog/blog/${id}.mdx`, `id: "${id}"\nslug: "fixture-post"\ntitle: "Fixture post"\ndate: "2026-01-01"`);
  await writeMdx(root, "src/content/projects/personal/general/project.mdx", "id: \"project\"\nslug: \"fixture-project\"\ntitle: \"Fixture project\"\ndate: \"2026-01-01\"");
  await writeJson(root, "src/data/config/slugs.json", { blog: { [id]: "fixture-post" } });
  await writeJson(root, "src/data/config/routes.json", {
    blog: {
      byPageId: { [id]: "/devlog/blog/fixture-post" },
      bySlug: { "fixture-post": { id, url: "/devlog/blog/fixture-post" } },
    },
  });
  await writeJson(root, "src/data/indexes/journal.json", { personal: [{ id, slug: "fixture-post", category: "blog" }], education: [] });
  await writeJson(root, "src/data/indexes/devlog.json", {});
  await writeJson(root, "src/data/indexes/projects.json", {
    projects: [{ id: "project", slug: "fixture-project", sourceFile: "personal/general/project.mdx" }],
  });
  await writeJson(root, "src/data/indexes/devlog-recommendations.json", {
    pages: [{ category: "blog", id, slug: "fixture-post", sourceFile: `src/content/devlog/blog/${id}.mdx` }],
    items: {},
  });
  return root;
}

afterEach(async () => {
  await Promise.all(fixtureRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })));
});

describe("content validation", () => {
  it("accepts valid content and produces identical owned-root manifests twice", async () => {
    // Given
    const root = await createFixture();

    // When
    const validation = validateContent(root);
    const determinism = verifyDeterministicGenerators(root);

    // Then
    expect(validation.contentFiles).toBe(2);
    expect(determinism.first).toEqual(determinism.second);
  }, 15_000);

  it.each([
    ["traversal", async (root) => writeJson(root, "src/data/indexes/projects.json", { projects: [{ id: "project", slug: "fixture-project", sourceFile: "../escape.mdx" }] }), "projects.json: sourceFile escapes"],
    ["duplicate slug", async (root) => writeMdx(root, `src/content/devlog/blog/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.mdx`, "id: \"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\"\nslug: \"fixture-post\"\ntitle: \"Duplicate\"\ndate: \"2026-01-01\""), "Duplicate public route"],
    ["missing indexed MDX", async (root) => rm(path.join(root, "src/content/projects/personal/general/project.mdx")), "projects.json: sourceFile does not exist"],
    ["malformed index", async (root) => writeFile(path.join(root, "src/data/indexes/journal.json"), "{ invalid", "utf8"), "journal.json: invalid JSON"],
    ["disallowed zero-row replacement", async (root) => writeJson(root, "src/data/indexes/projects.json", { projects: [] }), "projects.json: zero rows are not allowed"],
  ])("rejects %s with a path-specific error", async (_name, mutate, expectedMessage) => {
    // Given
    const root = await createFixture();
    await mutate(root);

    // When
    const action = () => validateContent(root);

    // Then
    expect(action).toThrow(expectedMessage);
  });
});
