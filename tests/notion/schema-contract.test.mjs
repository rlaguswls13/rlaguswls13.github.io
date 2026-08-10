import { describe, expect, it } from "vitest";
import {
  NOTION_SCHEMA,
  classifyNotionPages,
  validateNotionPage,
  writeQuarantineReport,
} from "../../scripts/notion/connect/schema-contract.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const id = "11111111111111111111111111111111";

describe("Notion schema and manifest contracts", () => {
  it("Given a page matching the group schema When it is validated Then it is accepted", () => {
    const result = validateNotionPage("devlog", {
      id,
      properties: {
        title: { type: "title", title: [{ plain_text: "A post" }] },
        category: { type: "select", select: { name: "tech_study" } },
        subcategory: { type: "select", select: { name: "node" } },
        tags: { type: "multi_select", multi_select: [] },
        created_date: { type: "date", date: { start: "2026-08-01" } },
      },
    });

    expect(result).toEqual({ valid: true, violations: [] });
    expect(NOTION_SCHEMA.devlog.columns.category.enum).toContain("tech_study");
  });

  it("Given an unknown column and invalid enum When validated Then it returns quarantine violations without exposing the value", () => {
    const result = validateNotionPage("project", {
      id,
      properties: {
        title: { type: "title", title: [{ plain_text: "Project" }] },
        category: { type: "select", select: { name: "unknown" } },
        created_date: { type: "date", date: { start: "2026-08-01" } },
        mystery: { type: "number", number: 123456 },
      },
    });

    expect(result.valid).toBe(false);
    expect(result.violations.map((violation) => violation.reason)).toEqual([
      "enum",
      "unknown-column",
    ]);
    expect(JSON.stringify(result)).not.toContain("123456");
  });

  it("Given previous and current stable page IDs When classified Then changes are deterministic", () => {
    const result = classifyNotionPages(
      [{ page_id: "a-b", last_edited_time: "2" }, { page_id: "c-d", last_edited_time: "1" }],
      [{ page_id: "a-b", last_edited_time: "1" }, { page_id: "e-f", last_edited_time: "1" }],
    );

    expect(result).toEqual({
      new: ["c-d"],
      updated: ["a-b"],
      deleted: ["e-f"],
      unchanged: [],
    });
  });

  it("Given quarantine violations When a report is written Then it is stored under the approved artifact path", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "notion-quarantine-"));
    try {
      const reportPath = writeQuarantineReport(root, [{
        pageId: id,
        group: "project",
        violations: [{ column: "mystery", reason: "unknown-column", expectedType: "known property" }],
      }]);
      expect(reportPath.replaceAll("\\", "/")).toBe("artifacts/notion-quarantine/report.json");
      expect(JSON.parse(fs.readFileSync(path.join(root, reportPath), "utf8"))).toMatchObject({ blocked: true });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
