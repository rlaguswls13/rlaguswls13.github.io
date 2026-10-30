import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveExportFile, validateStaticExport } from "../../scripts/export/inspector.mjs";

const temporaryRoots = [];
const giscusInfo = JSON.stringify({
  siteUrl: "https://example.test",
  giscus: {
    repository: "owner/discussions",
    repositoryId: "repository-id",
    category: "Announcements",
    categoryId: "category-id",
    language: "ko",
  },
});
const publicConfig = JSON.stringify({
  ...JSON.parse(giscusInfo),
  google: {
    adsenseAccount: null,
    ga4MeasurementId: null,
    searchConsoleVerification: null,
  },
  naver: {
    siteVerification: null,
  },
});

function html({ route, title, body, jsonLd = "" }) {
  const canonical = `https://example.test${route === "/" ? "" : route}`;
  return `<!doctype html><html><head><title>${title}</title><meta name="description" content="${title} description"><link rel="canonical" href="${canonical}"><meta property="og:title" content="${title}"><meta property="og:description" content="${title} description"><meta property="og:url" content="${canonical}"><meta property="og:image" content="https://example.test/opengraph-image.png"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${title} description"><meta name="twitter:image" content="https://example.test/opengraph-image.png">${jsonLd}</head><body>${body}</body></html>`;
}

async function writeRoute(outputRoot, route, markup, nested = false) {
  const relativePath = route === "/" ? "index.html" : nested ? `${route.slice(1)}/index.html` : `${route.slice(1)}.html`;
  const destination = path.join(outputRoot, ...relativePath.split("/"));
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, markup);
  return destination;
}

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "export-inspector-"));
  temporaryRoots.push(root);
  const outputRoot = path.join(root, "out");
  const dataRoot = path.join(root, "src", "data");
  await mkdir(path.join(root, ".cache", "build"), { recursive: true });
  await mkdir(path.join(dataRoot, "indexes"), { recursive: true });
  await writeFile(path.join(root, ".cache", "build", "public-config.json"), publicConfig);
  await writeFile(path.join(dataRoot, "indexes", "projects.json"), JSON.stringify({ projects: [{ id: "project-id", slug: "project-slug", title: "Project title" }] }));
  await writeFile(path.join(dataRoot, "indexes", "devlog-recommendations.json"), JSON.stringify({ pages: [{ href: "/devlog/study/devlog-slug", title: "Devlog title" }] }));

  for (const route of ["/", "/about", "/career", "/contact", "/devlog", "/journal", "/projects"]) {
    const listBody = ["/devlog", "/journal", "/projects"].includes(route)
      ? `<main><h1>${route} heading</h1><div class="${route === "/projects" ? "projects-grid" : "devlog-grid"}"><article class="${route === "/projects" ? "project-card" : "devlog-card"}">Visible content</article></div></main>`
      : `<main><h1>${route} heading</h1><p>Visible content excerpt for ${route}</p></main>`;
    await writeRoute(outputRoot, route, html({ route, title: `${route} title`, body: listBody }), route === "/about");
  }
  await writeRoute(outputRoot, "/projects/project-slug", html({ route: "/projects/project-slug", title: "Project title", body: "<article><h1>Project title</h1><p>Project body excerpt</p></article>" }));
  await writeRoute(outputRoot, "/devlog/study/devlog-slug", html({ route: "/devlog/study/devlog-slug", title: "Devlog title", body: "<article><h1>Devlog title</h1><p>Devlog body excerpt</p></article>", jsonLd: '<script type="application/ld+json">{"@context":"https://schema.org","@type":"BlogPosting","headline":"Devlog title","url":"https://example.test/devlog/study/devlog-slug"}</script>' }));
  await writeFile(path.join(outputRoot, "404.html"), "<!doctype html><html><body><main><h1>404</h1><p>Not found</p></main></body></html>");
  return { root, outputRoot };
}

afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("recursive static export inspector", () => {
  it("resolves base-prefixed and trailing-slash links against unprefixed output", async () => {
    // Given: a project Pages deployment whose output files omit the base path.
    const paths = await fixture();
    vi.stubEnv("BASE_PATH", "/blog");
    const files = ["index.html", "about/index.html", "career.html", "contact.html", "devlog.html", "journal.html", "projects.html", "projects/project-slug.html", "devlog/study/devlog-slug.html"];
    for (const relative of files) {
      const file = path.join(paths.outputRoot, relative);
      const markup = (await readFile(file, "utf8")).replaceAll("https://example.test", "https://example.test/blog");
      await writeFile(file, markup.replace("</main>", '<a href="/blog/projects/project-slug/">Project</a></main>'));
    }
    // When: destination validation inspects prefixed URLs.
    const report = await validateStaticExport(paths);
    // Then: the actual unprefixed export files satisfy those URLs.
    expect(report.verdict).toBe("PASS");
  });

  it("rejects an ID link when only the slug detail was exported", async () => {
    // Given: an otherwise valid export whose about card bypasses its slug.
    const paths = await fixture();
    const file = path.join(paths.outputRoot, "about", "index.html");
    await writeFile(file, (await readFile(file, "utf8")).replace("</main>", '<a href="/projects/project-id">Project</a></main>'));
    // When / Then: the missing destination blocks release.
    await expect(validateStaticExport(paths)).rejects.toThrow("/projects/project-id");
  });

  it("accepts existing slug links with queries and fragments and ignores external links", async () => {
    // Given: links to exported content and a third party.
    const paths = await fixture();
    const file = path.join(paths.outputRoot, "about", "index.html");
    await writeFile(file, (await readFile(file, "utf8")).replace("</main>", '<a href="/projects/project-slug?page=2#section">Project</a><a href="https://other.test/missing">External</a></main>'));
    // When: the export is inspected.
    const report = await validateStaticExport(paths);
    // Then: only destination paths on this site are required.
    expect(report.verdict).toBe("PASS");
  });

  it("validates every indexed detail, static route, and 404 while reporting the resolved nested output", async () => {
    // Given: a complete export with a nested static route and indexed details.
    const { root, outputRoot } = await fixture();
    const reportPath = path.join(root, "artifacts", "export-report.json");

    // When: the production inspector validates the export recursively.
    const report = await validateStaticExport({ root, outputRoot, reportPath });

    // Then: every expected route passes and the persisted report identifies the nested output.
    expect(report.verdict).toBe("PASS");
    expect(report.routes).toHaveLength(10);
    expect(report.routes.find((route) => route.route === "/about")?.file).toBe("about/index.html");
    expect(JSON.parse(await readFile(reportPath, "utf8"))).toMatchObject({ verdict: "PASS" });
  });

  it("resolves a route from either flat or nested export output", async () => {
    // Given: an export route written in nested form.
    const { outputRoot } = await fixture();

    // When: the route output is resolved.
    const result = await resolveExportFile(outputRoot, "/about");

    // Then: the nested candidate is selected.
    expect(result).toBe(path.join(outputRoot, "about", "index.html"));
  });

  it("accepts a rendered list that retains a loading boundary beside visible cards", async () => {
    // Given: a static list with its normal cards plus a framework loading boundary.
    const fixturePaths = await fixture();
    const file = path.join(fixturePaths.outputRoot, "devlog.html");
    await writeFile(file, html({ route: "/devlog", title: "/devlog title", body: '<main><div class="loading-placeholder">Loading</div><h1>/devlog heading</h1><article class="devlog-card">Visible content</article></main>' }));

    // When: the complete export is inspected.
    const report = await validateStaticExport(fixturePaths);

    // Then: real server content prevents the loading boundary from being treated as loading-only.
    expect(report.verdict).toBe("PASS");
  });

  for (const scenario of [
    ["missing flat and nested route", async ({ outputRoot }) => rm(path.join(outputRoot, "about"), { recursive: true, force: true }), "/about: output is missing"],
    ["duplicate canonical", async ({ outputRoot }) => {
      const file = path.join(outputRoot, "career.html");
      await writeFile(file, (await readFile(file, "utf8")).replace("</head>", '<link rel="canonical" href="https://example.test/career"></head>'));
    }, "/career: canonical expected once"],
    ["invalid JSON-LD", async ({ outputRoot }) => {
      const file = path.join(outputRoot, "devlog", "study", "devlog-slug.html");
      await writeFile(file, (await readFile(file, "utf8")).replace('{"@context":"https://schema.org","@type":"BlogPosting","headline":"Devlog title","url":"https://example.test/devlog/study/devlog-slug"}', "{"));
    }, "/devlog/study/devlog-slug: json-ld[0] is malformed"],
    ["Loading-only list", async ({ outputRoot }) => {
      const file = path.join(outputRoot, "devlog.html");
      await writeFile(file, html({ route: "/devlog", title: "/devlog title", body: '<main><h1>/devlog heading</h1><div class="loading-placeholder">Loading</div></main>' }));
    }, "/devlog: list output contains only Loading fallback"],
    ["missing H1 and body excerpt", async ({ outputRoot }) => writeFile(path.join(outputRoot, "index.html"), html({ route: "/", title: "/ title", body: "<main><p>Visible content</p></main>" })), "/: expected H1"],
    ["absent indexed detail", async ({ outputRoot }) => rm(path.join(outputRoot, "projects", "project-slug.html")), "/projects/project-slug: output is missing"],
  ]) {
    it(`rejects ${scenario[0]}`, async () => {
      // Given: an otherwise valid recursive static export.
      const fixturePaths = await fixture();
      await scenario[1](fixturePaths);

      // When: the invalid export is inspected.
      const inspection = validateStaticExport(fixturePaths);

      // Then: the route-specific failure prevents a passing report.
      await expect(inspection).rejects.toThrow(scenario[2]);
    });
  }
});
