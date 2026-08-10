import { describe, expect, it, vi } from "vitest";
import { main } from "../../scripts/notion/connect/fetch.mjs";
import { parseSourceConfiguration } from "../../scripts/notion/connect/source-config.mjs";

const IDS = Object.freeze({
  journal: "11111111111111111111111111111111",
  journalDataSource: "22222222222222222222222222222222",
  devlog: "33333333333333333333333333333333",
  project: "44444444444444444444444444444444",
  education: "55555555555555555555555555555555",
  personal: "66666666666666666666666666666666",
});

describe("parseSourceConfiguration", () => {
  it("returns the canonical, generic, and journal-alias sources in group order", () => {
    const result = parseSourceConfiguration({
      NOTION_PAGE_ID_JOURNAL: IDS.journal,
      NOTION_DATA_SOURCE_ID_JOURNAL: IDS.journalDataSource,
      NOTION_PAGE_ID_EDUCATION: IDS.education,
      NOTION_DATA_SOURCE_ID: `devlog:${IDS.devlog},project:${IDS.project}`,
      NOTION_REQUIRED_GROUPS: "journal,devlog,project",
    });

    expect(result.groups).toEqual({
      journal: [
        { id: IDS.journal, sourceType: "database" },
        { id: IDS.journalDataSource, sourceType: "data_source" },
        { id: IDS.education, sourceType: "database" },
      ],
      devlog: [{ id: IDS.devlog, sourceType: "data_source" }],
      project: [{ id: IDS.project, sourceType: "data_source" }],
    });
    expect(result.requiredGroups).toEqual(["journal", "devlog", "project"]);
    expect(result.warnings).toEqual([
      "NOTION_PAGE_ID_EDUCATION is deprecated; configure NOTION_PAGE_ID_JOURNAL instead.",
    ]);
  });

  it("deduplicates sources and emits deterministic compatibility warnings", () => {
    const result = parseSourceConfiguration({
      NOTION_PAGE_ID_JOURNAL: IDS.journal,
      NOTION_DATA_SOURCE_ID_JOURNAL: IDS.journal,
      NOTION_PAGE_ID_DEVELOG: IDS.devlog,
      NOTON_PAGE_ID_PORJECT: IDS.project,
      NOTION_REQUIRED_GROUPS: "journal,journal,devlog,project",
    });

    expect(result.groups.journal).toEqual([{ id: IDS.journal, sourceType: "database" }]);
    expect(result.warnings).toEqual([
      "Duplicate Notion source ignored for journal.",
      "NOTION_PAGE_ID_DEVELOG is deprecated; configure NOTION_PAGE_ID_DEVLOG instead.",
      "NOTON_PAGE_ID_PORJECT is deprecated; configure NOTION_PAGE_ID_PROJECT instead.",
      "Duplicate required group ignored: journal.",
    ]);
  });

  it("accepts YAML-style quoted lists from env.local.yml", () => {
    const result = parseSourceConfiguration({
      NOTION_PAGE_ID_JOURNAL: `['${IDS.journal}']`,
      NOTION_PAGE_ID_DEVLOG: `["${IDS.devlog}"]`,
      NOTION_PAGE_ID_PROJECT: `['${IDS.project}', '${IDS.project}']`,
    });

    expect(result.groups).toEqual({
      journal: [{ id: IDS.journal, sourceType: "database" }],
      devlog: [{ id: IDS.devlog, sourceType: "database" }],
      project: [{ id: IDS.project, sourceType: "database" }],
    });
    expect(result.warnings).toEqual(["Duplicate Notion source ignored for project."]);
  });

  it.each([
    ["bare generic ID", { NOTION_PAGE_ID: IDS.journal }, /must use category:id entries/],
    ["unknown generic scope", { NOTION_PAGE_ID: `unknown:${IDS.journal}` }, /unknown Notion source group/i],
    ["malformed ID", { NOTION_PAGE_ID_JOURNAL: "not-an-id" }, /invalid Notion source ID/i],
    ["missing required group", {
      NOTION_PAGE_ID_JOURNAL: IDS.journal,
      NOTION_REQUIRED_GROUPS: "journal,devlog",
    }, /required Notion source group is not configured: devlog/i],
    ["invalid required scope", { NOTION_REQUIRED_GROUPS: "Journal" }, /invalid NOTION_REQUIRED_GROUPS token/i],
    ["empty required token", { NOTION_REQUIRED_GROUPS: "journal," }, /invalid NOTION_REQUIRED_GROUPS token/i],
  ])("rejects %s", (_label, env, expected) => {
    expect(() => parseSourceConfiguration(env)).toThrow(expected);
  });

  it("requires all groups for CI when NOTION_REQUIRED_GROUPS is unset", () => {
    expect(() => parseSourceConfiguration({
      CI: "true",
      NOTION_PAGE_ID_JOURNAL: IDS.journal,
    })).toThrow(/required Notion source group is not configured: devlog/i);
  });

  it("fails source validation before constructing a client or calling a writer", async () => {
    const constructClient = vi.fn();
    const writer = vi.fn();

    await expect(main({
      env: { NOTION_TOKEN: "redacted", NOTION_PAGE_ID: IDS.journal },
      createClient: constructClient,
      syncPageContentFn: writer,
    })).rejects.toThrow(/must use category:id entries/);

    expect(constructClient).not.toHaveBeenCalled();
    expect(writer).not.toHaveBeenCalled();
  });
});
