import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { defaultWikiRoot, isWikiSourcePath, stripWikiPrefix } from "../../scripts/wiki/build-rag-index.mjs";

const root = process.cwd();
const wikiRoot = defaultWikiRoot();
const docsRoot = path.join(root, "docs");
const inventoryPath = path.join(wikiRoot, stripWikiPrefix(".wiki/docs-migration.json"));
const allowedRootMarkdown = ["AGENTS.md", "CLAUDE.md", "README.md"];

function resolveTarget(target) {
  return isWikiSourcePath(target) ? path.join(wikiRoot, stripWikiPrefix(target)) : path.join(root, target);
}

describe("project documentation surfaces", () => {
  it("maps every legacy docs page to an existing project surface", () => {
    const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
    const remainingLegacyDocs = fs
      .readdirSync(docsRoot)
      .filter((entry) => entry.toLowerCase().endsWith(".md") && entry !== "README.md")
      .sort();
    const mappedSources = inventory.mappings.map(({ source }) => source).sort();

    expect(inventory.sources.sort()).toEqual(mappedSources);
    expect(remainingLegacyDocs).toEqual([]);
    for (const mapping of inventory.mappings) {
      expect(mapping.targets.length).toBeGreaterThan(0);
      for (const target of mapping.targets) {
        expect(fs.existsSync(resolveTarget(target))).toBe(true);
      }
    }
  });

  it("leaves one controller in docs and names all three project surfaces", () => {
    const docsMarkdown = fs.readdirSync(docsRoot).filter((entry) => entry.toLowerCase().endsWith(".md"));
    const controller = fs.readFileSync(path.join(docsRoot, "README.md"), "utf8");

    expect(docsMarkdown).toEqual(["README.md"]);
    expect(controller).toContain("project/skills/");
    expect(controller).toContain("project/hooks/");
    expect(controller).toContain(".wiki/");
  });

  it("keeps durable project policy out of repository-root Markdown", () => {
    const rootMarkdown = fs
      .readdirSync(root)
      .filter((entry) => entry.toLowerCase().endsWith(".md"))
      .sort();

    expect(rootMarkdown).toEqual(allowedRootMarkdown);
  });
});
