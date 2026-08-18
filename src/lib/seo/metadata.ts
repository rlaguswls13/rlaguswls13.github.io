import type { Metadata } from "next";

type PageKind = "article" | "website";

export type PageMetadataInput = {
  readonly siteUrl: string;
  readonly basePath?: string;
  readonly pathname: string;
  readonly title: string;
  readonly description: string;
  readonly kind: PageKind;
  readonly author?: string;
  readonly publishedTime?: string;
};

export type PageMetadataContract = {
  readonly metadata: Metadata;
  readonly canonical: string;
  readonly title: string;
  readonly description: string;
  readonly kind: PageKind;
  readonly author?: string;
  readonly publishedTime?: string;
};

export type PersonJsonLd = {
  readonly "@context": "https://schema.org";
  readonly "@type": "Person";
  readonly name: string;
  readonly url: string;
};

export type WebSiteJsonLd = {
  readonly "@context": "https://schema.org";
  readonly "@type": "WebSite";
  readonly name: string;
  readonly url: string;
};

export type BlogPostingJsonLd = {
  readonly "@context": "https://schema.org";
  readonly "@type": "BlogPosting";
  readonly headline: string;
  readonly description: string;
  readonly url: string;
  readonly mainEntityOfPage: {
    readonly "@type": "WebPage";
    readonly "@id": string;
  };
  readonly datePublished: string;
  readonly author: {
    readonly "@type": "Person";
    readonly name: string;
  };
};

export type JsonLdDocument = WebSiteJsonLd | PersonJsonLd | BlogPostingJsonLd;

export class SeoContractError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SeoContractError";
  }
}

function requireText(value: string, field: string): string {
  const text = value.trim();
  if (text.length === 0) {
    throw new SeoContractError(`${field} must not be empty`);
  }
  return text;
}

function validatePath(value: string, field: string): string {
  if (!value.startsWith("/") || value.includes("\\") || value.includes("?") || value.includes("#") || value.includes("//")) {
    throw new SeoContractError(`${field} must be a site-relative path`);
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    throw new SeoContractError(`${field} must be URI-decodable`);
  }

  if (decoded.split("/").some((segment) => segment === "." || segment === ".." || segment.includes("\\"))) {
    throw new SeoContractError(`${field} must not traverse directories`);
  }

  return value === "/" ? "" : value.replace(/\/+$/, "");
}

function parseSiteUrl(siteUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(siteUrl);
  } catch {
    throw new SeoContractError("siteUrl must be an absolute HTTP(S) URL");
  }

  if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || parsed.search || parsed.hash || parsed.username || parsed.password) {
    throw new SeoContractError("siteUrl must be an absolute HTTP(S) URL without credentials, query, or fragment");
  }

  return parsed;
}

function absoluteHttpUrl(value: string): string {
  const parsed = parseSiteUrl(value);
  return parsed.toString().replace(/\/$/, "");
}

export function buildCanonicalUrl(siteUrl: string, pathname: string, basePath = ""): string {
  const site = parseSiteUrl(siteUrl);
  const normalizedBasePath = basePath === "" ? "" : validatePath(basePath, "basePath");
  const normalizedPathname = validatePath(pathname, "pathname");
  const sitePath = site.pathname === "/" ? "" : validatePath(site.pathname, "siteUrl path");
  const path = `${sitePath}${normalizedBasePath}${normalizedPathname}` || "/";
  return new URL(path, site.origin).toString();
}

const OPENGRAPH_IMAGE_PATH = "/opengraph-image.png";
const OPENGRAPH_IMAGE_WIDTH = 1200;
const OPENGRAPH_IMAGE_HEIGHT = 630;
const RSS_FEED_PATH = "/rss.xml";

export function buildPageMetadata(input: PageMetadataInput): PageMetadataContract {
  const title = requireText(input.title, "title");
  const description = requireText(input.description, "description");
  const canonical = buildCanonicalUrl(input.siteUrl, input.pathname, input.basePath);
  const author = input.author === undefined ? undefined : requireText(input.author, "author");
  const publishedTime = input.publishedTime === undefined ? undefined : requireText(input.publishedTime, "publishedTime");
  const rssUrl = buildCanonicalUrl(input.siteUrl, RSS_FEED_PATH, input.basePath);
  const ogImageUrl = buildCanonicalUrl(input.siteUrl, OPENGRAPH_IMAGE_PATH, input.basePath);
  const ogImage = { url: ogImageUrl, width: OPENGRAPH_IMAGE_WIDTH, height: OPENGRAPH_IMAGE_HEIGHT, alt: title };
  const openGraph = input.kind === "article"
    ? {
      title,
      description,
      url: canonical,
      type: "article" as const,
      images: [ogImage],
      ...(author === undefined ? {} : { authors: [author] }),
      ...(publishedTime === undefined ? {} : { publishedTime }),
    }
    : { title, description, url: canonical, type: "website" as const, images: [ogImage] };

  return {
    metadata: {
      title,
      description,
      alternates: { canonical, types: { "application/rss+xml": rssUrl } },
      openGraph,
      twitter: { card: "summary_large_image", title, description, images: [ogImageUrl] },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-image-preview": "large",
          "max-snippet": -1,
          "max-video-preview": -1,
        },
      },
    },
    canonical,
    title,
    description,
    kind: input.kind,
    ...(author === undefined ? {} : { author }),
    ...(publishedTime === undefined ? {} : { publishedTime }),
  };
}

export function assertUniqueMetadataTitles(pages: readonly PageMetadataContract[]): void {
  const titles = new Set<string>();
  for (const page of pages) {
    const normalizedTitle = page.title.normalize("NFKC").trim();
    if (titles.has(normalizedTitle)) {
      throw new SeoContractError(`Duplicate metadata title: ${page.title}`);
    }
    titles.add(normalizedTitle);
  }
}

export function buildRootJsonLd(input: {
  readonly siteName: string;
  readonly siteUrl: string;
  readonly person: {
    readonly name: string;
    readonly url: string;
  };
}): { readonly website: WebSiteJsonLd; readonly person: PersonJsonLd } {
  const siteName = requireText(input.siteName, "siteName");
  const siteUrl = absoluteHttpUrl(input.siteUrl);
  const personName = requireText(input.person.name, "person.name");
  const personUrl = absoluteHttpUrl(input.person.url);

  return {
    website: { "@context": "https://schema.org", "@type": "WebSite", name: siteName, url: siteUrl },
    person: { "@context": "https://schema.org", "@type": "Person", name: personName, url: personUrl },
  };
}

export function buildBlogPostingJsonLd(page: PageMetadataContract): BlogPostingJsonLd {
  if (page.kind !== "article") {
    throw new SeoContractError("BlogPosting requires article metadata");
  }
  if (page.author === undefined) {
    throw new SeoContractError("BlogPosting requires an author");
  }
  if (page.publishedTime === undefined) {
    throw new SeoContractError("BlogPosting requires a publishedTime");
  }

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: page.title,
    description: page.description,
    url: page.canonical,
    mainEntityOfPage: { "@type": "WebPage", "@id": page.canonical },
    datePublished: page.publishedTime,
    author: { "@type": "Person", name: page.author },
  };
}

export function serializeJsonLd(document: JsonLdDocument): string {
  return JSON.stringify(document)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}
