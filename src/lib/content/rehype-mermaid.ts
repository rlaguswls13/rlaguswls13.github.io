import type { Element, Root } from "hast";

type MermaidNode = Root["children"][number] | Element["children"][number];

function isElement(node: MermaidNode): node is Element {
  return node.type === "element";
}

function hasLanguageMermaid(code: Element): boolean {
  const className = code.properties?.className;
  const classNames = Array.isArray(className) ? className.map(String) : [];
  return classNames.includes("language-mermaid");
}

function rawText(node: MermaidNode): string {
  if (node.type === "text") return node.value;
  if (isElement(node)) return node.children.map(rawText).join("");
  return "";
}

function transform(children: MermaidNode[]): void {
  for (let index = 0; index < children.length; index += 1) {
    const node = children[index];
    if (!isElement(node)) continue;

    if (node.tagName === "pre" && node.children.length === 1) {
      const [code] = node.children;
      if (isElement(code) && code.tagName === "code" && hasLanguageMermaid(code)) {
        children[index] = {
          type: "element",
          tagName: "mermaid-diagram",
          properties: {},
          children: [{ type: "text", value: rawText(code) }],
        };
        continue;
      }
    }

    transform(node.children);
  }
}

// Fenced ```mermaid code blocks must be diverted to a diagram renderer before
// rehype-pretty-code runs, otherwise Shiki syntax-highlights the raw Mermaid
// source as plain text instead of a diagram getting drawn.
export function rehypeMermaid() {
  return (tree: Root) => {
    transform(tree.children);
  };
}
