import { existsSync, mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createDetailContentRoots,
  parseLegacyProjectDetail,
  resolveDevlogDetailSource,
  resolveProjectDetailSource,
} from "../../src/content/detail/boundaries";

const temporaryRoots: string[] = [];

function createRepositoryFixture(): string {
  const repositoryRoot = mkdtempSync(path.join(tmpdir(), "blog-detail-boundaries-"));
  temporaryRoots.push(repositoryRoot);
  mkdirSync(path.join(repositoryRoot, "src", "content", "devlog", "tech"), { recursive: true });
  mkdirSync(path.join(repositoryRoot, "src", "content", "projects", "personal"), { recursive: true });
  writeFileSync(path.join(repositoryRoot, "src", "content", "devlog", "tech", "safe.mdx"), "# safe");
  writeFileSync(path.join(repositoryRoot, "src", "content", "projects", "personal", "safe.mdx"), "# safe");
  return repositoryRoot;
}

afterEach(() => {
  for (const temporaryRoot of temporaryRoots.splice(0)) {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
});

describe("detail content boundaries", () => {
  it("resolves indexed devlog and project paths beneath their declared roots", () => {
    // Given: an isolated repository with indexed source files under both content roots.
    const repositoryRoot = createRepositoryFixture();
    const roots = createDetailContentRoots(repositoryRoot);

    // When: each indexed repository-relative source path is resolved.
    const devlog = resolveDevlogDetailSource("src/content/devlog/tech/safe.mdx", roots);
    const project = resolveProjectDetailSource("src/content/projects/personal/safe.mdx", roots);

    // Then: both point to an existing file inside their respective root.
    expect(devlog).toMatchObject({ ok: true });
    expect(project).toMatchObject({ ok: true });
    if (devlog.ok) expect(existsSync(devlog.value)).toBe(true);
    if (project.ok) expect(existsSync(project.value)).toBe(true);
  });

  it("resolves checked-in current content without leaving its declared root", () => {
    // Given: real indexed source paths from the checked-in content repository.
    const roots = createDetailContentRoots(process.cwd());

    // When: each route-owned resolver receives its current source path.
    const devlog = resolveDevlogDetailSource(
      "src/content/devlog/blog/3a319946ca768078b891d2ebf14c4741.mdx",
      roots,
    );
    const project = resolveProjectDetailSource(
      "src/content/projects/enterprise/general/3b119946ca7680409854ef872da66fb8.mdx",
      roots,
    );

    // Then: both current source files resolve successfully and exist on disk.
    expect(devlog).toMatchObject({ ok: true });
    expect(project).toMatchObject({ ok: true });
    if (devlog.ok) expect(existsSync(devlog.value)).toBe(true);
    if (project.ok) expect(existsSync(project.value)).toBe(true);
  });

  it.each([
    ["absolute", path.resolve("outside.mdx")],
    ["traversal", "src/content/devlog/../../projects/personal/safe.mdx"],
    ["missing", "src/content/devlog/tech/missing.mdx"],
  ])("rejects a %s devlog source without resolving outside its root", (_label, sourceFile) => {
    // Given: a declared devlog root and a hostile or stale indexed path.
    const roots = createDetailContentRoots(createRepositoryFixture());

    // When: the devlog resolver receives the indexed path.
    const result = resolveDevlogDetailSource(sourceFile, roots);

    // Then: it returns a typed failure instead of a path that can be read.
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toMatch(/invalid_source|missing_source/);
  });

  it("rejects a project path that traverses outside the project root", () => {
    // Given: a project root and a path that targets another content tree.
    const roots = createDetailContentRoots(createRepositoryFixture());

    // When: the project resolver receives the traversal path.
    const result = resolveProjectDetailSource("src/content/projects/../devlog/tech/safe.mdx", roots);

    // Then: it returns a typed invalid-source failure.
    expect(result).toMatchObject({ ok: false, error: { kind: "invalid_source" } });
  });

  it("rejects a source symlink that resolves outside the declared content root", () => {
    // Given: a file outside the devlog root linked from an indexed-looking source path.
    const repositoryRoot = createRepositoryFixture();
    const roots = createDetailContentRoots(repositoryRoot);
    const outsideDirectory = path.join(repositoryRoot, "outside");
    const linkedDirectory = path.join(repositoryRoot, "src", "content", "devlog", "tech", "linked");
    mkdirSync(outsideDirectory);
    writeFileSync(path.join(outsideDirectory, "outside.mdx"), "outside");
    symlinkSync(outsideDirectory, linkedDirectory, "junction");

    // When: the resolver canonicalizes the linked source file.
    const result = resolveDevlogDetailSource("src/content/devlog/tech/linked/outside.mdx", roots);

    // Then: it returns an invalid-source failure and never exposes the outside file path.
    expect(result).toMatchObject({ ok: false, error: { kind: "invalid_source", reason: "outside_root" } });
  });

  it("parses complete legacy project detail from JSON text", () => {
    // Given: the legacy JSON shape used by project detail frontmatter.
    const legacyDetail = JSON.stringify({
      id: "project-1",
      tech_stack: ["TypeScript"],
      sections: [{ title: "Overview", body: "Plain text", list: ["First item"] }],
      tabs: [{ title: "Architecture", sections: [{ title: "Flow", body: "Safe text" }] }],
    });

    // When: the parser receives the untrusted frontmatter value.
    const result = parseLegacyProjectDetail(legacyDetail);

    // Then: it produces complete typed arrays and the validated nested content.
    expect(result).toMatchObject({
      ok: true,
      value: {
        id: "project-1",
        tech_stack: ["TypeScript"],
        sections: [{ title: "Overview", body: "Plain text", list: ["First item"] }],
        tabs: [{ title: "Architecture", sections: [{ title: "Flow", body: "Safe text" }] }],
      },
    });
  });

  it.each([
    ["invalid JSON", "{"],
    ["missing id", JSON.stringify({ sections: [] })],
    ["malformed section", JSON.stringify({ id: "project-1", sections: [{ title: "Overview", list: [1] }] })],
    ["malformed tab", JSON.stringify({ id: "project-1", tabs: [{ title: "Tab", sections: "not-an-array" }] })],
  ])("returns a typed parse failure for %s", (_label, legacyDetail) => {
    // Given: malformed legacy JSON at the project-data trust boundary.

    // When: the parser receives it from frontmatter.
    const result = parseLegacyProjectDetail(legacyDetail);

    // Then: malformed nested data cannot become a ProjectDetail.
    expect(result).toMatchObject({ ok: false, error: { kind: "invalid_legacy_detail" } });
  });

  it("keeps HTML payloads as text data for React to render safely", () => {
    // Given: a legacy section with an HTML injection payload.
    const legacyDetail = JSON.stringify({
      id: "project-1",
      sections: [{ title: "Overview", body: "<img src=x onerror=alert(1)>", list: ["<script>alert(1)</script>"] }],
    });

    // When: the parser receives the untrusted text.
    const result = parseLegacyProjectDetail(legacyDetail);

    // Then: it retains literal strings and exposes no HTML-rendering capability.
    expect(result).toMatchObject({
      ok: true,
      value: {
        sections: [{ body: "<img src=x onerror=alert(1)>", list: ["<script>alert(1)</script>"] }],
      },
    });
  });
});
