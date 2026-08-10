import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { compile } from "@mdx-js/mdx";
import { describe, expect, it } from "vitest";
import { pageToMdxBody, richTextToMarkdown } from "../../scripts/notion/transfer/notion-blocks-to-mdx.mjs";
import { convertMdxComponents } from "../../scripts/notion/transfer/component-mappings.mjs";

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
