import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AboutProjectShowcase } from "../../src/components/ui/AboutProjectShowcase";
import { AboutProjectCarousel } from "../../src/components/ui/AboutProjectCarousel";
import type { Project } from "../../src/types";

const project: Project = {
  id: "storage-id",
  slug: "public-slug",
  title: "Project",
  periods: [],
  tags: [],
  description: "Description",
};

describe.each([
  ["showcase", AboutProjectShowcase],
  ["carousel", AboutProjectCarousel],
] as const)("%s project links", (_name, Component) => {
  it("uses the public slug when it differs from storage identity", () => {
    // Given: a project whose public slug differs from its storage ID.
    // When: its cards render.
    const html = renderToStaticMarkup(<Component projects={[project]} />);
    // Then: detail links use the generated public route.
    expect(html).toContain('href="/projects/public-slug"');
    expect(html).not.toContain('href="/projects/storage-id"');
  });

  it("retains the ID route when the project has no slug", () => {
    // Given: a legacy project without a slug.
    const legacyProject = { ...project };
    delete legacyProject.slug;
    // When: its cards render.
    const html = renderToStaticMarkup(<Component projects={[legacyProject]} />);
    // Then: the fallback matches generateStaticParams.
    expect(html).toContain('href="/projects/storage-id"');
  });
});
