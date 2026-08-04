import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  exportFile,
  inspectRouteMetadata,
  metadataRouteContracts,
  requireMetadataMatrix,
  requireRouteMetadata,
} from "../fixtures/metadata-html.mjs";

const exportRoot = process.env.METADATA_HTML_ROOT ?? "out";

async function realExportRows() {
  return Promise.all(metadataRouteContracts.map(async (contract) => ({
    contract,
    html: await readFile(exportFile(exportRoot, contract), "utf8"),
  })));
}

describe("real static export metadata matrix", () => {
  it("exports unique complete metadata for root, static, list, and detail routes", async () => {
    // Given: every representative HTML file from the real static export.
    const rows = await realExportRows();

    // When / Then: the parser requires unique and complete route metadata.
    expect(() => requireMetadataMatrix(rows)).not.toThrow();
  });

  it("exports only WebSite and Person structured data on the root route", async () => {
    const contract = metadataRouteContracts.find((item) => item.kind === "root");
    if (!contract) throw new Error("root metadata contract missing");
    const html = await readFile(exportFile(exportRoot, contract), "utf8");
    const result = requireRouteMetadata(html, contract);
    expect(result.jsonLd.map((document) => document["@type"])).toEqual(["WebSite", "Person"]);
  });

  it("exports content-backed BlogPosting structured data on a devlog detail", async () => {
    const contract = metadataRouteContracts.find((item) => item.kind === "devlog-detail");
    if (!contract) throw new Error("devlog metadata contract missing");
    const html = await readFile(exportFile(exportRoot, contract), "utf8");
    const result = requireRouteMetadata(html, contract);
    expect(result.jsonLd).toHaveLength(1);
    expect(result.jsonLd[0]).toMatchObject({
      "@type": "BlogPosting",
      headline: result.title,
      description: result.description,
      url: result.canonical,
      datePublished: contract.expectedPublishedTime,
      author: { "@type": "Person", name: contract.expectedAuthor },
    });
  });

  it("does not invent project structured data", async () => {
    const contract = metadataRouteContracts.find((item) => item.kind === "project-detail");
    if (!contract) throw new Error("project metadata contract missing");
    const html = await readFile(exportFile(exportRoot, contract), "utf8");
    expect(requireRouteMetadata(html, contract).jsonLd).toEqual([]);
  });
});

describe("metadata export adversarial fixtures", () => {
  const contract = metadataRouteContracts.find((item) => item.kind === "root");
  if (!contract) throw new Error("root metadata contract missing");

  it("rejects duplicate and missing metadata fields with route and field names", async () => {
    const html = await readFile(exportFile(exportRoot, contract), "utf8");
    expect(() => inspectRouteMetadata(html.replace("</head>", "<title>duplicate</title></head>"), contract)).toThrow("/: title expected once");
    expect(() => inspectRouteMetadata(html.replace(/<meta name="description"[^>]*>/u, ""), contract)).toThrow("/: description");
  });

  it("rejects malformed canonical output with the route name", async () => {
    const html = await readFile(exportFile(exportRoot, contract), "utf8");
    const malformed = html.replace(contract.expectedCanonical, "javascript:alert(1)");
    expect(() => requireRouteMetadata(malformed, contract)).toThrow("/: canonical");
  });

  it("rejects malformed and unsafe JSON-LD with the route and field names", async () => {
    const html = await readFile(exportFile(exportRoot, contract), "utf8");
    const malformed = html.replace(/(<script[^>]*type="application\/ld\+json"[^>]*>)[\s\S]*?(<\/script>)/u, "$1{$2");
    const unsafe = html.replace(/(<script[^>]*type="application\/ld\+json"[^>]*>)/u, "$1{\"@type\":\"WebSite\",\"name\":\"</script><script>alert(1)</script>\"}");
    expect(() => inspectRouteMetadata(malformed, contract)).toThrow("/: json-ld[0] is malformed");
    expect(() => inspectRouteMetadata(unsafe, contract)).toThrow("/: json-ld[0]");
  });
});
