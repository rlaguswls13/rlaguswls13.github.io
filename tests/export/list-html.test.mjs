import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { sortByDateDesc } from "../../src/lib/utils";
import { listRouteContracts, requireMeaningfulListHtml } from "../fixtures/list-html.mjs";

const exportRoot = process.env.LIST_HTML_ROOT ?? "out";

describe("list route default rendering characterization", () => {
  for (const contract of listRouteContracts) {
    it(`pins ${contract.route} default visible count, order, and card contract`, async () => {
      // Given: the route's unchanged static index and current six-card page size.
      const raw = JSON.parse(await readFile(path.join("src/data/indexes", `${contract.route}.json`), "utf8"));
      const indexedItems = contract.route === "devlog"
        ? Object.entries(raw).flatMap(([category, entries]) => entries.map((entry) => ({ ...entry, category })))
        : contract.route === "journal"
          ? Object.entries(raw).flatMap(([journalCategory, entries]) => entries.map((entry) => ({ ...entry, journalCategory })))
          : raw.projects;

      // When: the same stable date ordering used by each default route is applied.
      const firstPage = sortByDateDesc(indexedItems).slice(0, contract.visibleCount);

      // Then: visible count and first-item order remain pinned to the current UI.
      expect(firstPage).toHaveLength(contract.visibleCount);
      expect(firstPage[0]?.title).toBe(contract.firstTitle);
      expect(contract.cardClass).toMatch(/^(?:devlog|project)-card$/u);
      if (contract.linkClass !== null) expect(contract.linkClass).toBe("devlog-card-link");
    });
  }
});

describe("meaningful static list export", () => {
  for (const contract of listRouteContracts) {
    it(`exports the ${contract.route} H1 and first visible item`, async () => {
      // Given: the actual statically exported route HTML.
      const html = await readFile(path.join(exportRoot, `${contract.route}.html`), "utf8");

      // When: the HTML document is parsed as a DOM.
      const result = requireMeaningfulListHtml(html, contract);

      // Then: meaningful default content exists without client execution.
      expect(result.heading).toBe(contract.h1);
      expect(result.firstCardText).toContain(contract.firstTitle);
    });
  }

  it("rejects an export containing only a loading fallback", () => {
    // Given: a structurally valid route export whose server content regressed to Loading.
    const loadingOnly = "<!doctype html><html><body><main><div class=\"loading-placeholder\">Loading</div></main></body></html>";

    // When: the fixture is parsed through the production export inspector.
    const inspectLoadingOnly = () => requireMeaningfulListHtml(loadingOnly, listRouteContracts[0]);

    // Then: the parser rejects the fixture at the missing semantic heading boundary.
    expect(inspectLoadingOnly).toThrow("devlog: missing H1 기술 학습과 문제 해결 기록");
  });
});
