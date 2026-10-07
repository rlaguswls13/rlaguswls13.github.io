import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findMovedOrphans } from "../../scripts/notion/connect/orphan-paths.mjs";

const ID = "3ce19946ca7680c19677fb9fa7f3dea7";

function stage(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "orphan-paths-"));
  for (const relativePath of files) {
    const destination = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, "x");
  }
  return root;
}

const row = (overrides = {}) => ({ page_id: ID, source_id: ID, category: "tech_study", subcategory: "general", ...overrides });

describe("moved orphan detection", () => {
  it("Given a page moved to a new subcategory When both files exist Then only the old path is an orphan", () => {
    const root = stage([`src/content/devlog/tech_study/jvav/${ID}.mdx`, `src/content/devlog/tech_study/general/${ID}.mdx`]);

    expect(findMovedOrphans({ stageRoot: root, rowsByGroup: { devlog: [row()] } }))
      .toEqual([`src/content/devlog/tech_study/jvav/${ID}.mdx`]);
  });

  it("Given the new location was not written When the old file exists Then nothing is deleted", () => {
    const root = stage([`src/content/devlog/tech_study/jvav/${ID}.mdx`]);

    expect(findMovedOrphans({ stageRoot: root, rowsByGroup: { devlog: [row()] } })).toEqual([]);
  });

  it("Given a page removed from Notion When its cached file exists Then it is preserved", () => {
    const root = stage([`src/content/devlog/tech_study/jvav/${ID}.mdx`, "src/content/devlog/tech_study/general/other.mdx"]);

    expect(findMovedOrphans({ stageRoot: root, rowsByGroup: { devlog: [row({ page_id: "other", source_id: "other" })] } })).toEqual([]);
  });

  it("Given unconfigured groups and unrelated files Then nothing is reported", () => {
    const root = stage([`src/content/devlog/tech_study/general/${ID}.mdx`, "src/content/projects/x/general/zzz.mdx"]);

    expect(findMovedOrphans({ stageRoot: root, rowsByGroup: { devlog: [row()], project: null, journal: null } })).toEqual([]);
  });

  it("Given a project page moved Then the project root is searched too", () => {
    const root = stage([`src/content/projects/old/general/${ID}.mdx`, `src/content/projects/new/general/${ID}.mdx`]);

    expect(findMovedOrphans({ stageRoot: root, rowsByGroup: { project: [row({ category: "new" })] } }))
      .toEqual([`src/content/projects/old/general/${ID}.mdx`]);
  });
});
