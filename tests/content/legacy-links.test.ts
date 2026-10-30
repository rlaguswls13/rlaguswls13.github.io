import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MdxLink } from "../../src/components/ui/MdxLink";
import recommendationData from "../../src/data/indexes/devlog-recommendations.json";
import { createLegacyLinkResolver, resolveLegacyContentLink } from "../../src/lib/content/legacy-links";

describe("legacy Notion content links", () => {
  const id = "35e19946ca76807b9fe4f64d17b2e1b6";
  const route = "/devlog/education/java-development-environment-and-basic-syntax";

  it("resolves published page IDs while preserving query and unmapped block fragments", () => {
    expect(resolveLegacyContentLink(`/p/${id}?view=1#3ab19946ca76808aa755f0385cf56ac7`))
      .toBe(`${route}?view=1#3ab19946ca76808aa755f0385cf56ac7`);
    expect(resolveLegacyContentLink(`https://app.notion.com/p/Java-${id}`)).toBe(route);
    expect(resolveLegacyContentLink("/p/35e19946-ca76-807b-9fe4-f64d17b2e1b6")).toBe(route);
  });

  it("resolves only exact unique published titles", () => {
    const resolve = createLegacyLinkResolver([
      { id, title: "Java 기초", href: route },
      { id: "other", title: "Duplicate", href: "/one" },
      { id: "another", title: "Duplicate", href: "/two" },
    ]);
    expect(resolve(`https://app.notion.com/p/${encodeURIComponent("Java 기초")}?x=1#section`)).toBe(`${route}?x=1#section`);
    for (const title of ["Duplicate", "Java", "java 기초", "Java 기초 "]) {
      const href = `https://app.notion.com/p/${encodeURIComponent(title)}`;
      expect(resolve(href)).toBe(href);
    }
  });

  it.each([
    "https://example.com/p/35e19946ca76807b9fe4f64d17b2e1b6",
    "https://app.notion.com.evil.test/p/35e19946ca76807b9fe4f64d17b2e1b6",
    "https://app.notion.com/p/%E0%A4%A",
    "/p/unknown", "/devlog/education/already-correct", "#heading", "mailto:test@example.com",
  ])("leaves unknown, malformed and external hrefs unchanged: %s", (href) => {
    expect(resolveLegacyContentLink(href)).toBe(href);
  });

  it("renders corrected anchors while retaining their text and attributes", () => {
    const html = renderToStaticMarkup(createElement(MdxLink, {
      href: `/p/${id}#original-block`, className: "reference", title: "Read more",
    }, "Binary"));
    expect(html).toContain(`href="${route}#original-block"`);
    expect(html).toContain('class="reference"');
    expect(html).toContain('title="Read more"');
    expect(html).toContain(">Binary</a>");
    expect(renderToStaticMarkup(createElement(MdxLink, {}, "No destination"))).toBe("<a>No destination</a>");
  });

  it("maps current body links only when their title has one exact published match", () => {
    const hrefs = recommendationData.pages.flatMap((page) => {
      const content = readFileSync(page.sourceFile, "utf8");
      return [...content.matchAll(/\]\((https:\/\/app\.notion\.com\/p\/[^)]+)\)/g)]
        .map((match) => match[1]).filter((href): href is string => href !== undefined);
    });
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      const title = decodeURIComponent(href.split("/p/")[1] ?? "");
      const matches = recommendationData.pages.filter((page) => page.title === title);
      expect(resolveLegacyContentLink(href)).toBe(matches.length === 1 ? matches[0]?.href : href);
    }
  });

  it("keeps known unmatched titles intact rather than guessing a similar article", () => {
    const title = "JVM과 JRE - 차이";
    const href = `https://app.notion.com/p/${encodeURIComponent(title)}`;
    expect(resolveLegacyContentLink(href)).toBe(href);
  });
});
