import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DevlogPage from "../../src/app/devlog/page";
import JournalPage from "../../src/app/journal/page";
import ProjectsPage from "../../src/app/projects/page";

const navigation = vi.hoisted(() => ({
  search: "",
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

describe("list route integration", () => {
  beforeEach(() => {
    navigation.replace.mockReset();
  });

  it.each([
    ["devlog", DevlogPage, "q=was&page=999", "devlog-card-link"],
    ["journal", JournalPage, "q=java&page=999", "devlog-card-link"],
    ["projects", ProjectsPage, "q=devops&page=999", "project-card"],
  ])("renders matching %s content from an out-of-range page", (_route, Page, search, cardClass) => {
    // Given: a nonempty filtered list requested beyond its final page.
    navigation.search = search;

    // When: the public list route renders its initial URL state.
    const markup = renderToStaticMarkup(createElement(Page));

    // Then: filtering does not turn matching content into an empty result page.
    expect(markup).toContain(cardClass);
    expect(markup).not.toContain("devlog-empty-state");
  });
});
