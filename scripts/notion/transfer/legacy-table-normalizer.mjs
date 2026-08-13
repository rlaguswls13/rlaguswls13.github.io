const ALLOWED_TAGS = new Set(["div", "table", "thead", "tbody", "tr", "th", "td", "strong", "code", "br"]);
const VOID_TAGS = new Set(["br"]);
const TABLE_BLOCK = /(?:&lt;div\b[^>]*>\s*)?&lt;table\b[^>]*>[\s\S]*?&lt;\/table>(?:\s*&lt;\/div>)?/giu;
const ANY_TAG = /(?:&lt;|<)(\/)?([a-z][a-z0-9-]*)(?:\s[^>]*)?>/giu;
const NORMALIZED_TAG = /<\/?(?:notion-table|thead|tbody|tr|th|td|strong|code)>|<br \/>/giu;

function normalizeTag(tag, closing) {
  if (tag === "div") return "";
  const outputTag = tag === "table" ? "notion-table" : tag;
  if (VOID_TAGS.has(tag)) return "<br />";
  return `<${closing ? "/" : ""}${outputTag}>`;
}

function escapeTextNodes(source) {
  let cursor = 0;
  let output = "";
  for (const match of source.matchAll(NORMALIZED_TAG)) {
    output += source.slice(cursor, match.index)
      .replaceAll("<", "&lt;")
      .replaceAll("{", "&#123;")
      .replaceAll("}", "&#125;");
    output += match[0];
    cursor = match.index + match[0].length;
  }
  return output + source.slice(cursor)
    .replaceAll("<", "&lt;")
    .replaceAll("{", "&#123;")
    .replaceAll("}", "&#125;");
}

function removeUnclosedLegacyTextFences(source) {
  if (/^\s*```\s*$/mu.test(source)) return source;
  return source.replace(/^\s*```text\s*$/gimu, "");
}

function normalizeTableBlock(block) {
  const containsRawStructure = /<(?:\/?)(?:tbody|tr|td)\b/iu.test(block);
  const source = containsRawStructure
    ? removeUnclosedLegacyTextFences(block)
    : block;
  const stack = [];
  let valid = true;
  let sawTable = false;

  const normalized = source.replace(ANY_TAG, (_match, slash, rawTag) => {
    const tag = rawTag.toLowerCase();
    const closing = Boolean(slash);
    if (!ALLOWED_TAGS.has(tag)) {
      valid = false;
      return _match;
    }
    if (tag === "table") sawTable = true;
    if (!VOID_TAGS.has(tag)) {
      if (closing) {
        if (stack.pop() !== tag) valid = false;
      } else {
        stack.push(tag);
      }
    }
    return normalizeTag(tag, closing);
  });

  return valid && sawTable && stack.length === 0 ? escapeTextNodes(normalized) : block;
}

export function normalizeLegacyEscapedTables(source) {
  return String(source || "").replace(TABLE_BLOCK, normalizeTableBlock);
}
