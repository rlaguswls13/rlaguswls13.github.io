import { createProcessor } from "@mdx-js/mdx";

const parser = createProcessor({ format: "md" });

export function emphasisDiagnostics(content, file, lineOffset = 0) {
  const warnings = [];
  function visit(node) {
    const children = node.children || [];
    for (const [index, child] of children.entries()) {
      const previous = children[index - 1];
      if (child.type === "text" && previous?.type === "inlineCode") {
        const start = child.position.start;
        const raw = content.slice(start.offset, child.position.end.offset);
        if (previous.position.end.offset === start.offset && /^\*{1,2}[\p{L}]/u.test(raw)) {
          warnings.push({ file, line: start.line + lineOffset, column: start.column, code: "suspicious-emphasis" });
        }
      }
      visit(child);
    }
  }
  visit(parser.parse(content));
  return warnings;
}
