import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { compile } from "@mdx-js/mdx";
import { describe, expect, it } from "vitest";
import { pageToMdxBody, richTextToMarkdown } from "../../scripts/notion/transfer/notion-blocks-to-mdx.mjs";
import { convertMdxComponents } from "../../scripts/notion/transfer/component-mappings.mjs";
import { normalizeLegacyEscapedTables } from "../../scripts/notion/transfer/legacy-table-normalizer.mjs";

const approvedImageUrl = "https://prod-files-secure.s3.us-west-2.amazonaws.com/image.png";

function imageClient(url = approvedImageUrl) {
  return {
    async getBlockChildren() {
      return [{
        id: "image-block",
        type: "image",
        has_children: false,
        image: { external: { url }, caption: [] },
      }];
    },
  };
}

describe("Notion content security boundaries", () => {
  it("Given Notion structural markers When converted Then only approved MDX components are emitted", async () => {
    // Given: table, collapse, and diagram-like source markers.
    const source = "<notion-table><notion-toggle title=\"Details\">body</notion-toggle></notion-table>";

    // When: the production component mapping is applied.
    const converted = convertMdxComponents(source);

    // Then: the known mapping is used and arbitrary JSX names are not introduced.
    expect(converted).toContain("<NotionTable>");
    expect(converted).toContain("<NotionToggle");
    await expect(compile(converted)).resolves.toBeDefined();
  });

  it("Given rich text with Markdown and MDX payloads When converted Then Markdown remains and JSX expressions become text", async () => {
    // Given: Notion rich text containing ordinary Markdown plus MDX JSX and expression payloads.
    const richText = [{ plain_text: "[safe](https://example.com) <script>alert(1)</script> {process.env.SECRET}" }];

    // When: the production converter prepares the text for MDX compilation.
    const markdown = richTextToMarkdown(richText);

    // Then: Markdown remains machine-readable while untrusted MDX syntax is inert and compilable.
    expect(markdown).toContain("[safe](https://example.com)");
    expect(markdown).not.toContain("<script>");
    expect(markdown).not.toContain("{process.env.SECRET}");
    await expect(compile(markdown)).resolves.toBeDefined();
  });

  it("Given a legacy HTML table in Notion text When converted Then it becomes a safe NotionTable", async () => {
    const table = [
      '<table className="w-full" onclick="alert(1)">',
      "<thead><tr><th>방식</th><th>특징</th></tr></thead>",
      "<tbody><tr><td><strong>Chunk</strong></td><td><code>Reader</code> 기반</td></tr></tbody>",
      "</table>",
    ].join("\n");
    const client = {
      async getBlockChildren() {
        return [{
          id: "legacy-table",
          type: "paragraph",
          has_children: false,
          paragraph: { rich_text: [{ plain_text: table }] },
        }];
      },
    };

    const body = await pageToMdxBody(client, "page");

    expect(body).toContain("<NotionTable>");
    expect(body).toContain("<strong>Chunk</strong>");
    expect(body).not.toContain("className");
    expect(body).not.toContain("onclick");
    expect(body).not.toContain("&lt;table");
    await expect(compile(body)).resolves.toBeDefined();
  });

  it("Given an unapproved tag inside a legacy table When converted Then the payload stays inert", async () => {
    const table = "<table><tbody><tr><td><script>alert(1)</script></td></tr></tbody></table>";
    const client = {
      async getBlockChildren() {
        return [{
          id: "unsafe-table",
          type: "paragraph",
          has_children: false,
          paragraph: { rich_text: [{ plain_text: table }] },
        }];
      },
    };

    const body = await pageToMdxBody(client, "page");

    expect(body).not.toContain("<NotionTable>");
    expect(body).not.toContain("<script>");
    expect(body).toContain("&lt;script>");
    await expect(compile(body)).resolves.toBeDefined();
  });

  it("Given an MDX expression inside an escaped legacy table When normalized Then it remains text", async () => {
    const source = "&lt;table>&lt;tbody>&lt;tr>&lt;td>{process.env.SECRET}&lt;/td>&lt;/tr>&lt;/tbody>&lt;/table>";

    const normalized = normalizeLegacyEscapedTables(source);

    expect(normalized).toContain("<notion-table>");
    expect(normalized).toContain("&#123;process.env.SECRET&#125;");
    expect(normalized).not.toContain("{process.env.SECRET}");
    await expect(compile(convertMdxComponents(normalized))).resolves.toBeDefined();
  });

  it("Given fenced code inside a hybrid legacy table When normalized Then the fences are preserved", async () => {
    const source = [
      "&lt;table>",
      "<tbody><tr><td>",
      "```text",
      "const value = 1;",
      "```",
      "</td></tr></tbody>",
      "&lt;/table>",
    ].join("\n");

    const normalized = normalizeLegacyEscapedTables(source);

    expect(normalized).toContain("```text\nconst value = 1;\n```");
    await expect(compile(convertMdxComponents(normalized))).resolves.toBeDefined();
  });

  it("Given an unsafe bookmark URL When converted Then it is omitted", async () => {
    const client = {
      async getBlockChildren() {
        return [{ id: "bookmark", type: "bookmark", has_children: false, bookmark: { url: "javascript:alert(1)" } }];
      },
    };
    const body = await pageToMdxBody(client, "page");
    expect(body).not.toContain("javascript:");
    await expect(compile(body)).resolves.toBeDefined();
  });

  it("Given a project child page When converted Then its content becomes a project tab", async () => {
    // Given: a project page with one declared child page and a heading in that child page.
    const client = {
      async getBlockChildren(blockId) {
        if (blockId === "parent") {
          return [{
            id: "parent-heading",
            type: "heading_2",
            has_children: false,
            heading_2: { rich_text: [{ plain_text: "Overview" }] },
          }, {
            id: "child-page",
            type: "child_page",
            has_children: true,
            child_page: { title: "Architecture" },
          }];
        }
        return [{
          id: "child-heading",
          type: "heading_2",
          has_children: false,
          heading_2: { rich_text: [{ plain_text: "System design" }] },
        }];
      },
    };

    // When: the project page body is generated from Notion blocks.
    const body = await pageToMdxBody(client, "parent", { pageName: "project" });

    // Then: the child page is represented as a mapped tab with its nested content.
    expect(body).toContain('<ProjectTabs>');
    expect(body).toContain('<ProjectTab title="Architecture">');
    expect(body).toContain("System design");
    expect(body.indexOf("<ProjectTabs>")).toBeLessThan(body.indexOf("## 목차"));
    await expect(compile(body)).resolves.toBeDefined();
  });

  it("Given an unapproved image host When a page is converted Then no network request occurs", async () => {
    // Given: an image URL outside the explicit Notion storage allowlist.
    let requested = false;

    // When: the production converter reaches the image block.
    const conversion = pageToMdxBody(imageClient("https://127.0.0.1/private.png"), "page", {
      fetch: async () => {
        requested = true;
        return new Response();
      },
    });

    // Then: private-network access is rejected before fetch.
    await expect(conversion).rejects.toThrow(/approved Notion image host/u);
    expect(requested).toBe(false);
  });

  it("Given an approved image When downloaded Then redirects and timeout are constrained", async () => {
    // Given: an approved image response and a temporary output root.
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "notion-image-security-"));
    let requestOptions;

    try {
      // When: the production converter downloads the image.
      await pageToMdxBody(imageClient(), "page", {
        root,
        fetch: async (_url, options) => {
          requestOptions = options;
          return new Response(Uint8Array.from([1, 2, 3]), {
            status: 200,
            headers: { "content-length": "3", "content-type": "image/png" },
          });
        },
      });

      // Then: redirects are forbidden and a live abort signal bounds the request.
      expect(requestOptions?.redirect).toBe("error");
      expect(requestOptions?.signal).toBeInstanceOf(AbortSignal);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("Given an oversized image response When downloaded Then it is rejected before writing", async () => {
    // Given: an approved host returning a declared body larger than the download cap.
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "notion-image-security-"));

    try {
      // When: the production converter validates the response.
      const conversion = pageToMdxBody(imageClient(), "page", {
        root,
        fetch: async () => new Response(Uint8Array.from([1]), {
          status: 200,
          headers: { "content-length": String(11 * 1024 * 1024), "content-type": "image/png" },
        }),
      });

      // Then: the cap blocks the image and no asset is persisted.
      await expect(conversion).rejects.toThrow(/size limit/u);
      expect(fs.existsSync(path.join(root, "public", "images", "notion", "imageblock.png"))).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
