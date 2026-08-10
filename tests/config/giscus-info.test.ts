import { describe, expect, it } from "vitest";
import { parseGiscusInfo } from "@/lib/giscus-info";

const serializedConfig = JSON.stringify({
  siteUrl: "https://rlaguswls13.github.io",
  giscus: {
    repository: "rlaguswls13/giscus-blog",
    repositoryId: "R_kgDOTe9p7Q",
    category: "Announcements",
    categoryId: "DIC_kwDOTe9p7c4DBpNR",
    language: "ko",
  },
});

describe("GISCUS_INFO configuration", () => {
  it("parses the single GitHub variable payload", () => {
    expect(parseGiscusInfo(serializedConfig)).toEqual({
      siteUrl: "https://rlaguswls13.github.io",
      giscus: {
        repository: "rlaguswls13/giscus-blog",
        repositoryId: "R_kgDOTe9p7Q",
        category: "Announcements",
        categoryId: "DIC_kwDOTe9p7c4DBpNR",
        language: "ko",
      },
    });
  });

  it.each([undefined, "", "not-json", '{"siteUrl":"https://example.test"}'])(
    "rejects missing or malformed data: %s",
    (value) => {
      expect(() => parseGiscusInfo(value)).toThrow(/GISCUS_INFO/u);
    },
  );
});
