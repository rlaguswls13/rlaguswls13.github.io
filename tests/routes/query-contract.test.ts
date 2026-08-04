import { describe, expect, it } from "vitest";
import {
  devlogListQuery,
  journalListQuery,
  projectListQuery,
} from "../../src/lib/list-query";

describe("list query contract", () => {
  it("parses and serializes canonical devlog state", () => {
    // Given: a canonical list URL.
    const query = new URLSearchParams("tab=tech_study&sub=java&q=spring%20boot&page=2");

    // When: the devlog route parses and serializes it.
    const state = devlogListQuery.parse(query);

    // Then: every supported value round-trips canonically.
    expect(state).toEqual({
      tab: "tech_study",
      sub: "java",
      q: "spring boot",
      page: 2,
    });
    expect(devlogListQuery.serialize(state)).toBe("tab=tech_study&sub=java&q=spring+boot&page=2");
  });

  it("canonicalizes the shipped pkg alias to sub", () => {
    // Given: a legacy home-page list URL.
    const query = new URLSearchParams("tab=tech_study&pkg=java&page=2");

    // When: the route parses then serializes it.
    const state = devlogListQuery.parse(query);

    // Then: the canonical query retains the filter without emitting pkg.
    expect(devlogListQuery.serialize(state)).toBe("tab=tech_study&sub=java&page=2");
    expect(devlogListQuery.href(state)).toBe("/devlog?tab=tech_study&sub=java&page=2");
  });

  it("prefers canonical sub over a conflicting pkg alias", () => {
    // Given: a URL containing conflicting canonical and legacy filters.
    const query = new URLSearchParams("tab=tech_study&sub=java&pkg=container");

    // When: the route parses it.
    const state = devlogListQuery.parse(query);

    // Then: sub is authoritative.
    expect(state.sub).toBe("java");
  });

  it("uses safe defaults for malformed list inputs", () => {
    // Given: invalid filters, whitespace-only search, and non-finite page input.
    const query = new URLSearchParams("tab=unknown&sub=unknown&pkg=also-unknown&q=%20%20&page=NaN");

    // When: the route parses it.
    const state = devlogListQuery.parse(query);

    // Then: no invalid value enters route state or canonical output.
    expect(state).toEqual({ tab: "all", sub: "전체", q: "", page: 1 });
    expect(devlogListQuery.serialize(state)).toBe("");
  });

  it("defaults negative and overflow pages", () => {
    // Given: unsafe page values from an external URL.
    const negative = new URLSearchParams("page=-3");
    const overflow = new URLSearchParams("page=9007199254740992");

    // When: the route parses each input.
    const negativeState = devlogListQuery.parse(negative);
    const overflowState = devlogListQuery.parse(overflow);

    // Then: both remain on the safe first page.
    expect(negativeState.page).toBe(1);
    expect(overflowState.page).toBe(1);
  });

  it("clamps a requested page after filtering", () => {
    // Given: a filtered list with seven results and six items per page.
    const state = devlogListQuery.parse(new URLSearchParams("page=9"));

    // When: pagination derives a safe page from the filtered result count.
    const page = devlogListQuery.clampPage(state.page, 7, 6);

    // Then: the final existing page is selected.
    expect(page).toBe(2);
    expect(devlogListQuery.pageHref(state, 9, 7, 6)).toBe("/devlog?page=2");
  });

  it("builds public hrefs without manual aliases", () => {
    // Given: typed state for every list route.
    const devlogState = devlogListQuery.parse(new URLSearchParams("tab=tech_study&sub=java&q=docker&page=3"));
    const journalState = journalListQuery.parse(new URLSearchParams("category=education&pkg=2026&page=2"));
    const projectState = projectListQuery.parse(new URLSearchParams("tab=personal&q=portfolio&page=2"));

    // When: each route builds its public href.
    const hrefs = [
      devlogListQuery.href(devlogState),
      journalListQuery.href(journalState),
      projectListQuery.href(projectState),
    ];

    // Then: routes use their canonical state keys and never expose pkg.
    expect(hrefs).toEqual([
      "/devlog?tab=tech_study&sub=java&q=docker&page=3",
      "/journal?category=education&sub=2026&page=2",
      "/projects?tab=personal&q=portfolio&page=2",
    ]);
    expect(hrefs.join("&")).not.toContain("pkg=");
  });
});
