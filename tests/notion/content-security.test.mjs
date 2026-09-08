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

  it("Given adjacent rich-text segments sharing an emphasis When converted Then one JSX wrapper spans the run with inline code intact", async () => {
    // Given: Notion split one bold phrase into a bold code span followed by bold prose.
    const richText = [
      { plain_text: "README.md", annotations: { bold: true, code: true } },
      { plain_text: "에 스키마를 적는다", annotations: { bold: true } },
    ];

    // When: the production converter renders the run.
    const markdown = richTextToMarkdown(richText);

    // Then: one <strong> wraps the whole run and the inline code survives.
    expect(markdown).toBe("<strong>`README.md`에 스키마를 적는다</strong>");
    const compiled = String(await compile(markdown));
    expect(compiled).toContain("_components.code");
    expect(compiled).not.toContain("**");
  });

  it("Given a bold run whose edge is punctuation followed by a Korean particle When converted Then the emphasis still renders", async () => {
    // Given: `**설정(OOP)**를` — the CommonMark shape that leaves a literal `**`.
    const richText = [
      { plain_text: "객체지향 언어(OOP)", annotations: { bold: true } },
      { plain_text: "는 패러다임이다", annotations: {} },
    ];

    // When: the production converter renders the run.
    const markdown = richTextToMarkdown(richText);

    // Then: a <strong> tag carries it — flanking rules never apply.
    expect(markdown).toBe("<strong>객체지향 언어(OOP)</strong>는 패러다임이다");
    const compiled = String(await compile(markdown));
    expect(compiled).toContain('"strong"');
    expect(compiled).not.toContain("**");
  });

  it("Given a bold run ending in a code span followed by a particle When converted Then no literal marker leaks", async () => {
    const richText = [
      { plain_text: "Spring Boot ", annotations: { bold: true } },
      { plain_text: "application.yml", annotations: { bold: true, code: true } },
      { plain_text: "에서 선언한다", annotations: {} },
    ];

    const markdown = richTextToMarkdown(richText);

    expect(markdown).toBe("<strong>Spring Boot `application.yml`</strong>에서 선언한다");
    const compiled = String(await compile(markdown));
    expect(compiled).not.toContain("**");
  });

  it("Given a bold run that is only a code span followed by a particle When converted Then emphasis is preserved", async () => {
    const richText = [
      { plain_text: "ThreadLocal", annotations: { bold: true, code: true } },
      { plain_text: "은 스레드별 저장소다", annotations: {} },
    ];

    const markdown = richTextToMarkdown(richText);

    expect(markdown).toBe("<strong>`ThreadLocal`</strong>은 스레드별 저장소다");
    const compiled = String(await compile(markdown));
    expect(compiled).not.toContain("**");
  });

  it("Given author-typed **bold** literal text When converted Then it becomes a <strong> tag", async () => {
    // Given: a plain segment where the author typed asterisks rather than using
    // Notion's bold annotation, ending in punctuation before a Korean particle.
    const richText = [{ plain_text: "핵심은 **덕 타이핑(Duck Typing)**과 **MRO**다" }];

    // When: the production converter renders it.
    const markdown = richTextToMarkdown(richText);

    // Then: both literal runs become <strong> and nothing renders as raw `**`.
    expect(markdown).toBe("핵심은 <strong>덕 타이핑(Duck Typing)</strong>과 <strong>MRO</strong>다");
    const compiled = String(await compile(markdown));
    expect(compiled).not.toContain("**");
  });

  it("Given Python power operators or shell globs in prose When converted Then no `**` pair is treated as emphasis", async () => {
    for (const text of [
      "지수는 2**8 = 256 그리고 3**4 이다",
      "경로는 src/**/*.ts 와 dist/**/*.js 두 곳",
      "복잡도는 n**2, 최악은 n**3",
    ]) {
      expect(richTextToMarkdown([{ plain_text: text }])).toBe(text);
    }
  });

  it("Given typed `**` inside a Markdown link When converted Then the link is left intact", async () => {
    const richText = [{ plain_text: "참고 [**볼드**링크](https://x.com/a**b) 끝" }];
    const markdown = richTextToMarkdown(richText);
    expect(markdown).toBe("참고 [**볼드**링크](https://x.com/a**b) 끝");
  });

  it("Given an author-typed private-use sentinel char When converted Then it cannot corrupt code-span masking", async () => {
    const richText = [{ plain_text: "입력 ￹0￻ 그리고 `code` 끝" }];
    const markdown = richTextToMarkdown(richText);
    expect(markdown).toBe("입력 0 그리고 `code` 끝");
  });

  it("Given a bold run containing a blank line When converted Then it folds to a break, not an unclosed tag", async () => {
    const richText = [{ plain_text: "첫 문단\n\n둘째 문단", annotations: { bold: true } }];
    const markdown = richTextToMarkdown(richText);
    expect(markdown).toBe("<strong>첫 문단<br />둘째 문단</strong>");
    await expect(compile(markdown)).resolves.toBeDefined();
  });

  it("Given author-typed **bold** straddling an inline-code segment When converted Then the whole run becomes one <strong>", async () => {
    // Given: Notion split `**`DispatcherServlet`**을` into three segments —
    // the typed `**` markers land in the plain text on either side of the code.
    const richText = [
      { plain_text: "Spring MVC는 **" },
      { plain_text: "DispatcherServlet", annotations: { code: true } },
      { plain_text: "**을 중심으로 작동한다" },
    ];

    // When: the production converter renders the run.
    const markdown = richTextToMarkdown(richText);

    // Then: the marker pair is joined across segments and no literal `**` leaks.
    expect(markdown).toBe("Spring MVC는 <strong>`DispatcherServlet`</strong>을 중심으로 작동한다");
    const compiled = String(await compile(markdown));
    expect(compiled).toContain("_components.code");
    expect(compiled).not.toContain("**");
  });

  it("Given a bold run bounded by leading and trailing spaces When converted Then the spaces sit outside the tags", async () => {
    // Given: a single bold segment padded with surrounding whitespace.
    const richText = [{ plain_text: " 강조 ", annotations: { bold: true } }];

    // When: the production converter renders it.
    const markdown = richTextToMarkdown(richText);

    // Then: the tags hug the text, not the whitespace.
    expect(markdown).toBe(" <strong>강조</strong> ");
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

  it("Given a heading containing a generic type When converted Then the table of contents escapes it", async () => {
    // Given: two headings whose plain text includes a Java-generic-like `<...>` payload.
    const client = {
      async getBlockChildren() {
        return [{
          id: "heading-1",
          type: "heading_2",
          has_children: false,
          heading_2: { rich_text: [{ plain_text: "Map<String, Object> 반환을 금지해야 하는 이유" }] },
        }, {
          id: "heading-2",
          type: "heading_3",
          has_children: false,
          heading_3: { rich_text: [{ plain_text: "ApiResponse<T> 패턴" }] },
        }];
      },
    };

    // When: the production converter builds the table of contents from raw heading text.
    const body = await pageToMdxBody(client, "page");

    // Then: the ToC link labels are entity-escaped, not left as unterminated JSX tags.
    expect(body).toContain("[Map&lt;String, Object&gt; 반환을 금지해야 하는 이유]");
    expect(body).toContain("[ApiResponse&lt;T&gt; 패턴]");
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
