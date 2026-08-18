import { describe, expect, it } from "vitest";
import { buildRssFeed } from "../../src/lib/seo/rss";

const siteUrl = "https://example.com";

describe("RSS feed contract", () => {
  it("starts with the XML declaration and a valid rss root element", () => {
    const xml = buildRssFeed({
      siteUrl,
      title: "TECH LOG",
      description: "A developer journal.",
      entries: [],
    });

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<rss version="2.0">');
    expect(xml).toContain("<channel>");
    expect(xml).toContain(`<link>${siteUrl}/</link>`);
  });

  it("escapes unsafe characters in title and description", () => {
    const xml = buildRssFeed({
      siteUrl,
      title: "TECH LOG",
      description: "A & B <script>alert(1)</script>",
      entries: [{ title: 'Post "one" & <two>', description: "desc & <tag>", href: "/devlog/one", date: "2026-07-20" }],
    });

    expect(xml).not.toContain("<script>");
    expect(xml).toContain("A &amp; B &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(xml).toContain("Post &quot;one&quot; &amp; &lt;two&gt;");
    expect(xml).toContain("desc &amp; &lt;tag&gt;");
  });

  it("converts entry dates to RFC 822/UTC pubDate values", () => {
    const xml = buildRssFeed({
      siteUrl,
      title: "TECH LOG",
      description: "A developer journal.",
      entries: [{ title: "Post", description: "desc", href: "/devlog/one", date: "2026-07-20" }],
    });

    expect(xml).toContain("<pubDate>Mon, 20 Jul 2026 00:00:00 GMT</pubDate>");
  });

  it("builds an absolute permalink link and guid for each item", () => {
    const xml = buildRssFeed({
      siteUrl,
      basePath: "/portfolio",
      title: "TECH LOG",
      description: "A developer journal.",
      entries: [{ title: "Post", description: "desc", href: "/devlog/one", date: "2026-07-20" }],
    });

    expect(xml).toContain("<link>https://example.com/portfolio/devlog/one</link>");
    expect(xml).toContain('<guid isPermaLink="true">https://example.com/portfolio/devlog/one</guid>');
  });

  it("sorts items by date descending and de-duplicates repeated guids", () => {
    const xml = buildRssFeed({
      siteUrl,
      title: "TECH LOG",
      description: "A developer journal.",
      entries: [
        { title: "Older", description: "desc", href: "/devlog/older", date: "2026-01-01" },
        { title: "Newer", description: "desc", href: "/devlog/newer", date: "2026-07-20" },
        { title: "Newer duplicate", description: "desc", href: "/devlog/newer", date: "2026-07-20" },
      ],
    });

    const newerIndex = xml.indexOf("/devlog/newer");
    const olderIndex = xml.indexOf("/devlog/older");
    expect(newerIndex).toBeGreaterThan(-1);
    expect(olderIndex).toBeGreaterThan(newerIndex);
    expect(xml.match(/<item>/g)).toHaveLength(2);
  });

  it("omits entries without a date and caps the item count at the configured limit", () => {
    const entries = Array.from({ length: 5 }, (_, index) => ({
      title: `Post ${index}`,
      description: "desc",
      href: `/devlog/post-${index}`,
      date: `2026-01-0${index + 1}`,
    }));
    entries.push({ title: "No date", description: "desc", href: "/devlog/no-date", date: "" });

    const xml = buildRssFeed({
      siteUrl,
      title: "TECH LOG",
      description: "A developer journal.",
      entries,
      itemLimit: 3,
    });

    expect(xml).not.toContain("/devlog/no-date");
    expect(xml.match(/<item>/g)).toHaveLength(3);
  });
});
