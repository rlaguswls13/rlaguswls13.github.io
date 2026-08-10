import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const docsRoot = path.join(root, "docs");
const inventoryPath = path.join(root, "project/wiki/docs-migration.json");

describe("project documentation surfaces", () => {
  it("maps every legacy docs page to an existing project surface", () => {
    const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
    const remainingLegacyDocs = fs
      .readdirSync(docsRoot)
      .filter((entry) => entry.endsWith(".md") && entry !== "README.md")
      .sort();
    const mappedSources = inventory.mappings.map(({ source }) => source).sort();

    expect(inventory.sources.sort()).toEqual(mappedSources);
    expect(remainingLegacyDocs).toEqual([]);
    for (const mapping of inventory.mappings) {
      expect(mapping.targets.length).toBeGreaterThan(0);
      for (const target of mapping.targets) {
        expect(fs.existsSync(path.join(root, target))).toBe(true);
      }
    }
  });

  it("leaves one controller in docs and names all three project surfaces", () => {
    const docsMarkdown = fs.readdirSync(docsRoot).filter((entry) => entry.endsWith(".md"));
    const controller = fs.readFileSync(path.join(docsRoot, "README.md"), "utf8");

    expect(docsMarkdown).toEqual(["README.md"]);
    expect(controller).toContain("project/skills/");
    expect(controller).toContain("project/hooks/");
    expect(controller).toContain("project/wiki/");
  });
});
