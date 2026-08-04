import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import matter from "gray-matter";
import {
  assertUniqueMetadataTitles,
  buildBlogPostingJsonLd,
  buildPageMetadata,
  buildRootJsonLd,
  serializeJsonLd,
} from "../../src/lib/seo/metadata";
import recommendationData from "../../src/data/indexes/devlog-recommendations.json";

const siteUrl = "https://example.com";
const approvedDescriptionSources = [
  "src/content/devlog/education/3a319946ca76806db9ecf8824115ebea.mdx",
  "src/content/devlog/education/3a319946ca76802aa2cff193b6a2456e.mdx",
  "src/content/devlog/education/3a319946ca76807b8e7ac1d05c32e441.mdx",
  "src/content/devlog/education/3a319946ca7680a6b7b3f98589e30442.mdx",
] as const;

function requireApprovedDescriptions(pages: readonly { readonly sourceFile: string; readonly description: string }[]): void {
  for (const sourceFile of approvedDescriptionSources) {
    const sourceDescription = String(matter(readFileSync(sourceFile, "utf8")).data.description || "");
    const generated = pages.find((page) => page.sourceFile === sourceFile);
    if (!generated || generated.description !== sourceDescription) {
      throw new Error(`${sourceFile}: stale generated description`);
    }
    if (generated.description === "작성된 내용이 없습니다.") {
      throw new Error(`${sourceFile}: placeholder description`);
    }
  }
}
describe("SEO metadata contracts", () => {
  it("retains devlog description, author, and date in generated page data", () => {
    // Given: the checked-in recommendation index generated from devlog frontmatter.
    const firstPage = recommendationData.pages[0];
    if (firstPage === undefined) {
      throw new Error("Expected generated devlog page data");
    }
    const source = matter(readFileSync(firstPage.sourceFile, "utf8")).data;

    // When: the generated entry is compared with its referenced MDX frontmatter.
    const generatedFields = firstPage;

    // Then: description, author, and date retain their exact frontmatter values.
    expect(generatedFields.description).toBe(String(source.description || ""));
    expect(generatedFields.author).toBe(String(source.author || ""));
    expect(generatedFields.date).toBe(String(source.date || ""));
    expect(generatedFields.description).not.toBe("");
  });

  it("retains all four approved source-owned descriptions in generated page data", () => {
    const pages = recommendationData.pages;
    expect(() => requireApprovedDescriptions(pages)).not.toThrow();
  });

  it("rejects a stale generated description for an approved source", () => {
    const staleSource = approvedDescriptionSources[0];
    const pages = recommendationData.pages.map((page) => page.sourceFile === staleSource
      ? { ...page, description: "stale generated value" }
      : page);
    expect(() => requireApprovedDescriptions(pages)).toThrow(`${staleSource}: stale generated description`);
  });

  it("rejects BlogPosting JSON-LD when a generated entry has no author", () => {
    // Given: a real generated devlog entry whose source frontmatter has an empty author.
    const page = recommendationData.pages.find((entry) => entry.description && entry.date && entry.author === "");
    if (page === undefined) {
      throw new Error("Expected a generated devlog entry with an empty author");
    }
    const metadata = buildPageMetadata({
      siteUrl,
      pathname: page.href,
      title: `${page.title} | TECH LOG`,
      description: page.description,
      kind: "article",
      publishedTime: page.date,
    });

    // When / Then: the contract refuses to invent an author for the BlogPosting schema.
    expect(() => buildBlogPostingJsonLd(metadata)).toThrow("author");
  });

  it("builds unique root, devlog, and project metadata with a deployment base path", () => {
    // Given: approved page fixtures under a GitHub Pages-style base path.
    const root = buildPageMetadata({
      siteUrl,
      basePath: "/portfolio",
      pathname: "/",
      title: "TECH LOG",
      description: "A developer portfolio and technical journal.",
      kind: "website",
    });
    const devlog = buildPageMetadata({
      siteUrl,
      basePath: "/portfolio",
      pathname: "/devlog/java-memory",
      title: "Java memory model | TECH LOG",
      description: "An analysis of Java memory behavior.",
      kind: "article",
      publishedTime: "2026-07-20",
      author: "Kim Hyunjin",
    });
    const project = buildPageMetadata({
      siteUrl,
      basePath: "/portfolio",
      pathname: "/projects/d",
      title: "Delivery platform | TECH LOG",
      description: "A production delivery platform case study.",
      kind: "website",
    });

    // When: contracts are built for the three approved page types.
    const metadata = [root, devlog, project];

    // Then: every page has a unique title plus canonical, OG, and Twitter fields.
    expect(root.canonical).toBe("https://example.com/portfolio");
    expect(devlog.canonical).toBe("https://example.com/portfolio/devlog/java-memory");
    expect(devlog.metadata.openGraph).toMatchObject({
      title: devlog.title,
      description: devlog.description,
      url: devlog.canonical,
      type: "article",
    });
    expect(devlog.metadata.twitter).toMatchObject({ card: "summary" });
    expect(() => assertUniqueMetadataTitles(metadata)).not.toThrow();
  });

  it("builds parseable root WebSite/Person and devlog BlogPosting JSON-LD", () => {
    // Given: a devlog metadata contract with its frontmatter-derived fields.
    const devlog = buildPageMetadata({
      siteUrl,
      pathname: "/devlog/java-memory",
      title: "Java memory model | TECH LOG",
      description: "An analysis of Java memory behavior.",
      kind: "article",
      publishedTime: "2026-07-20",
      author: "Kim Hyunjin",
    });

    // When: approved JSON-LD schemas are built and serialized for a script element.
    const root = buildRootJsonLd({
      siteName: "TECH LOG",
      siteUrl,
      person: { name: "Kim Hyunjin", url: "https://example.com/about" },
    });
    const post = buildBlogPostingJsonLd(devlog);
    const serialized = serializeJsonLd(post);

    // Then: the schema fields remain machine-parseable and complete.
    expect(root.website["@type"]).toBe("WebSite");
    expect(root.person["@type"]).toBe("Person");
    expect(JSON.parse(serialized)).toMatchObject({
      "@type": "BlogPosting",
      headline: devlog.title,
      description: devlog.description,
      datePublished: "2026-07-20",
      author: { "@type": "Person", name: "Kim Hyunjin" },
    });
  });

  it("rejects malformed canonical input", () => {
    // Given: a path that is not a canonical site-relative path.
    const malformed = { siteUrl, pathname: "javascript:alert(1)", title: "Unsafe", description: "Unsafe", kind: "website" } as const;

    // When / Then: the boundary refuses the malformed canonical.
    expect(() => buildPageMetadata(malformed)).toThrow("pathname");
  });

  it("rejects duplicate metadata titles", () => {
    // Given: two distinct paths with the same page title.
    const first = buildPageMetadata({ siteUrl, pathname: "/one", title: "Repeated", description: "One", kind: "website" });
    const second = buildPageMetadata({ siteUrl, pathname: "/two", title: "Repeated", description: "Two", kind: "website" });

    // When / Then: the collection contract identifies the collision.
    expect(() => assertUniqueMetadataTitles([first, second])).toThrow("Duplicate metadata title");
  });

  it("rejects a BlogPosting missing a required author or publication date", () => {
    // Given: article metadata that has no author or published date.
    const incomplete = buildPageMetadata({
      siteUrl,
      pathname: "/devlog/incomplete",
      title: "Incomplete article",
      description: "Missing frontmatter fields.",
      kind: "article",
    });

    // When / Then: the BlogPosting boundary rejects the incomplete source.
    expect(() => buildBlogPostingJsonLd(incomplete)).toThrow("author");
  });

  it("serializes script-breaking text without a raw closing script tag", () => {
    // Given: untrusted content text that would terminate a script element if emitted raw.
    const unsafe = buildPageMetadata({
      siteUrl,
      pathname: "/devlog/unsafe",
      title: "Unsafe </script><script>alert(1)</script>",
      description: "Description </script><script>alert(1)</script>",
      kind: "article",
      publishedTime: "2026-07-20",
      author: "Kim Hyunjin",
    });

    // When: it is used to create and serialize a BlogPosting document.
    const serialized = serializeJsonLd(buildBlogPostingJsonLd(unsafe));

    // Then: parsing preserves the text while the emitted script payload has no raw angle brackets.
    expect(serialized).not.toContain("</script>");
    expect(serialized).not.toContain("<");
    expect(JSON.parse(serialized)).toMatchObject({ headline: unsafe.title, description: unsafe.description });
  });
});
