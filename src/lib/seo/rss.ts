import { buildCanonicalUrl } from "./metadata";

export type RssFeedEntry = {
  readonly title: string;
  readonly description: string;
  readonly href: string;
  readonly date: string;
};

export type RssFeedInput = {
  readonly siteUrl: string;
  readonly basePath?: string;
  readonly title: string;
  readonly description: string;
  readonly entries: readonly RssFeedEntry[];
  readonly itemLimit?: number;
};

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function parseEntryDate(date: string): Date {
  return new Date(date.replaceAll(".", "-"));
}

function toRfc822(date: string): string {
  return parseEntryDate(date).toUTCString();
}

function buildItem(entry: RssFeedEntry, siteUrl: string, basePath: string): string {
  const link = buildCanonicalUrl(siteUrl, entry.href, basePath);
  return [
    "<item>",
    `<title>${escapeXml(entry.title)}</title>`,
    `<link>${link}</link>`,
    `<guid isPermaLink="true">${link}</guid>`,
    `<description>${escapeXml(entry.description)}</description>`,
    `<pubDate>${toRfc822(entry.date)}</pubDate>`,
    "</item>",
  ].join("");
}

export function buildRssFeed(input: RssFeedInput): string {
  const basePath = input.basePath ?? "";
  const itemLimit = input.itemLimit ?? 20;
  const seenGuids = new Set<string>();
  const items = [...input.entries]
    .filter((entry) => entry.date)
    .sort((a, b) => parseEntryDate(b.date).getTime() - parseEntryDate(a.date).getTime())
    .filter((entry) => {
      const guid = buildCanonicalUrl(input.siteUrl, entry.href, basePath);
      if (seenGuids.has(guid)) return false;
      seenGuids.add(guid);
      return true;
    })
    .slice(0, itemLimit)
    .map((entry) => buildItem(entry, input.siteUrl, basePath))
    .join("");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "<channel>",
    `<title>${escapeXml(input.title)}</title>`,
    `<link>${buildCanonicalUrl(input.siteUrl, "/", basePath)}</link>`,
    `<description>${escapeXml(input.description)}</description>`,
    `<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    items,
    "</channel>",
    "</rss>",
  ].join("");
}
