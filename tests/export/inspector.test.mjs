import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveExportFile, validateStaticExport } from "../../scripts/export/inspector.mjs";

const temporaryRoots = [];

function html({ route, title, body, jsonLd = "" }) {
  const canonical = `https://example.test${route === "/" ? "" : route}`;
  return `<!doctype html><html><head><title>${title}</title><meta name="description" content="${title} description"><link rel="canonical" href="${canonical}"><meta property="og:title" content="${title}"><meta property="og:description" content="${title} description"><meta property="og:url" content="${canonical}"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${title} description">${jsonLd}</head><body>${body}</body></html>`;
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
  await mkdir(path.join(dataRoot, "config"), { recursive: true });
  await mkdir(path.join(dataRoot, "indexes"), { recursive: true });
  await writeFile(path.join(dataRoot, "config", "site.json"), JSON.stringify({ siteUrl: "https://example.test" }));
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
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("recursive static export inspector", () => {
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
