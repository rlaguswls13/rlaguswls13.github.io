import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ProjectDetailClient, { LegacyProjectSections } from "../../src/app/projects/[id]/ProjectDetailClient";
import projectsMeta from "../../src/data/indexes/projects.json";
import { createDetailContentRoots, resolveProjectDetailSource } from "../../src/content/detail/boundaries";

const devlogRoutePath = "src/app/devlog/[category]/[slug]/page.tsx";
const projectRoutePath = "src/app/projects/[id]/page.tsx";
const projectClientPath = "src/app/projects/[id]/ProjectDetailClient.tsx";

describe("detail route safety", () => {
  it("routes devlog source failures through the rooted resolver and notFound", () => {
    // Given: the public devlog detail route source.
    const source = readFileSync(devlogRoutePath, "utf8");

    // When: its source-loading boundary is inspected.

    // Then: stale, absolute, and traversal index paths become a Next 404.
    expect(source).toContain("resolveDevlogDetailSource");
    expect(source).toContain("notFound()");
  });

  it("routes project source and legacy parse failures through typed boundaries and notFound", () => {
    // Given: the public project detail route source.
    const source = readFileSync(projectRoutePath, "utf8");

    // When: its source-loading and legacy-data boundaries are inspected.

    // Then: unsafe sources and malformed JSON cannot reach rendering.
    expect(source).toContain("resolveProjectDetailSource");
    expect(source).toContain("parseLegacyProjectDetail");
    expect(source).toContain("notFound()");
  });

  it("renders legacy body and list payloads as escaped React text with line breaks", () => {
    // Given: legacy rich-text fields containing an HTML payload and a newline.
    const markup = renderToStaticMarkup(
      createElement(LegacyProjectSections, {
        sections: [
          {
            title: "Overview",
            body: "first line\n<img src=x onerror=window.__unsafe_marker=1>",
            list: ["<script>window.__unsafe_marker=1</script>"],
          },
        ],
      }),
    );

    // When: React server-renders the legacy sections.

    // Then: text is escaped and the newline becomes a React line break.
    expect(markup).toContain("first line<br/>");
    expect(markup).toContain("&lt;img src=x onerror=window.__unsafe_marker=1&gt;");
    expect(markup).toContain("&lt;script&gt;window.__unsafe_marker=1&lt;/script&gt;");
    expect(markup).not.toContain("<img src=x");
    expect(markup).not.toContain("<script>");
    expect(readFileSync(projectClientPath, "utf8")).not.toContain("dangerouslySetInnerHTML");
  });

  it("resolves the current indexed project source through the route boundary", () => {
    // Given: the first current project index entry and its declared content roots.
    const project = projectsMeta.projects[0];
    const roots = createDetailContentRoots(process.cwd());

    // When: the route resolves that indexed source file.
    const result = project?.sourceFile
      ? resolveProjectDetailSource(project.sourceFile, roots)
      : { ok: false as const };

    // Then: a current valid project source is available for rendering.
    expect(result).toMatchObject({ ok: true });
  });

  it("renders the legacy project overview and diagram loading labels in Korean", () => {
    // Given: a valid legacy project detail with a deferred diagram.
    const markup = renderToStaticMarkup(
      createElement(ProjectDetailClient, {
        meta: {
          id: "legacy-project",
          title: "Legacy project",
          periods: [],
          tags: [],
          description: "A legacy project",
        },
        detail: {
          id: "legacy-project",
          project_id: undefined,
          overview: undefined,
          tech_stack: [],
          sections: [],
          tabs: [],
          diagram: undefined,
          reference: undefined,
          flow_diagram: "diagrams/email-large-scale.html",
        },
      }),
    );

    // When: the detail renderer produces its initial server markup.

    // Then: the intended Korean labels are visible and the regression copy is absent.
    expect(markup).toContain("프로젝트 개요");
    expect(markup).toContain("다이어그램 불러오는 중");
    expect(markup).not.toContain("Project overview");
    expect(markup).not.toContain("Loading diagram");
  });
});
