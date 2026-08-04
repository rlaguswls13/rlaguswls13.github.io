import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const listLinkProducers = [
  "src/app/page.tsx",
  "src/app/devlog/page.tsx",
  "src/app/journal/page.tsx",
  "src/app/projects/page.tsx",
  "src/components/layout/DevlogBackLink.tsx",
  "src/components/layout/ProjectBackLink.tsx",
] as const;

describe("canonical list link producers", () => {
  it("does not emit the legacy pkg query key", async () => {
    // Given: every route and component that produces a list URL.
    const sources = await Promise.all(listLinkProducers.map((file) => readFile(resolve(file), "utf8")));

    // When: their generated query-key literals are inspected.
    const generatedListLinks = sources.join("\n");

    // Then: no producer can generate the legacy pkg key.
    expect(generatedListLinks).not.toContain("pkg=");
  });
});
