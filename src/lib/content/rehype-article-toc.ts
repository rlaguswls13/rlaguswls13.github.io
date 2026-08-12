import type { Element, Root } from "hast";

type TocNode = Root["children"][number] | Element["children"][number];

function isElement(node: TocNode): node is Element {
  return node.type === "element";
}

function isWhitespace(node: TocNode): boolean {
  return node.type === "text" && /^\s*$/.test(node.value);
}

function hasChildren(node: TocNode): node is TocNode & { children: TocNode[] } {
  return "children" in node && Array.isArray(node.children);
}

function transformChildren(children: TocNode[]): boolean {
  for (let headingIndex = 0; headingIndex < children.length; headingIndex += 1) {
    const heading = children[headingIndex];
    if (!isElement(heading)) {
      continue;
    }
    if (heading.tagName === "h2") {
      let listIndex = headingIndex + 1;
      while (listIndex < children.length && isWhitespace(children[listIndex])) listIndex += 1;

      const list = children[listIndex];
      if (isElement(list) && list.tagName === "ul") {
        const details: Element = {
          type: "element",
          tagName: "details",
          properties: { className: ["article-toc"], open: true },
          children: [
            { type: "element", tagName: "summary", properties: {}, children: heading.children },
            list,
          ],
        };
        children.splice(headingIndex, listIndex - headingIndex + 1, details);
        return true;
      }
    }
    if (hasChildren(heading) && transformChildren(heading.children)) return true;
  }
  return false;
}

export function rehypeArticleToc() {
  return (tree: Root) => {
    transformChildren(tree.children);
  };
}
