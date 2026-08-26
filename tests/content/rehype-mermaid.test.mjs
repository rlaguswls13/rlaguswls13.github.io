import { describe, expect, it } from "vitest";
import { rehypeMermaid } from "../../src/lib/content/rehype-mermaid";

function codeBlock(language, text) {
  return {
    type: "element",
    tagName: "pre",
    properties: {},
    children: [{
      type: "element",
      tagName: "code",
      properties: { className: [`language-${language}`] },
      children: [{ type: "text", value: text }],
    }],
  };
}

describe("rehypeMermaid", () => {
  it("Given a fenced mermaid code block When transformed Then it becomes a mermaid-diagram element carrying the raw source", () => {
    // Given: a root with one mermaid code block.
    const tree = { type: "root", children: [codeBlock("mermaid", "flowchart TD\n  A --> B")] };

    // When: the plugin runs.
    rehypeMermaid()(tree);

    // Then: the pre/code pair is replaced with a plain mermaid-diagram element.
    expect(tree.children).toHaveLength(1);
    const [node] = tree.children;
    expect(node.tagName).toBe("mermaid-diagram");
    expect(node.children).toEqual([{ type: "text", value: "flowchart TD\n  A --> B" }]);
  });

  it("Given a fenced code block in another language When transformed Then it is left untouched", () => {
    // Given: a root with one Java code block.
    const tree = { type: "root", children: [codeBlock("java", "class A {}")] };

    // When: the plugin runs.
    rehypeMermaid()(tree);

    // Then: the pre/code structure is unchanged so later highlighting still applies.
    const [node] = tree.children;
    expect(node.tagName).toBe("pre");
    expect(node.children[0].tagName).toBe("code");
  });

  it("Given a mermaid block nested inside another element When transformed Then it is still found and converted", () => {
    // Given: a mermaid block wrapped in a figure, as MDX may produce.
    const tree = {
      type: "root",
      children: [{
        type: "element",
        tagName: "figure",
        properties: {},
        children: [codeBlock("mermaid", "graph LR\n  X --> Y")],
      }],
    };

    // When: the plugin runs.
    rehypeMermaid()(tree);

    // Then: the nested pre/code pair is converted in place.
    const diagram = tree.children[0].children[0];
    expect(diagram.tagName).toBe("mermaid-diagram");
    expect(diagram.children[0].value).toBe("graph LR\n  X --> Y");
  });
});
