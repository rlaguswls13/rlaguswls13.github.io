export const DEFAULT_COMPONENT_MAP = Object.freeze({
  "notion-callout": "NotionCallout",
  "notion-divider": "NotionDivider",
  "notion-image": "NotionImage",
  "notion-indent": "NotionIndent",
  "notion-table": "NotionTable",
  "notion-toggle": "NotionToggle",
});

export const PAGE_COMPONENT_MAPS = Object.freeze({
  journal: Object.freeze({}),
  devlog: Object.freeze({}),
  project: Object.freeze({}),
});

function validComponentName(value) {
  return /^[A-Z][A-Za-z0-9._]*$/.test(String(value || ""));
}

export function componentMapFor(pageName = "", overrides = {}) {
  const mappings = {
    ...DEFAULT_COMPONENT_MAP,
    ...(PAGE_COMPONENT_MAPS[pageName] || {}),
    ...(overrides || {}),
  };
  for (const [sourceName, componentName] of Object.entries(mappings)) {
    if (!/^[a-z][a-z0-9-]*$/.test(sourceName) || !validComponentName(componentName)) {
      throw new Error(`Invalid MDX component mapping: ${sourceName} -> ${componentName}`);
    }
  }
  return mappings;
}

export function convertMdxComponents(source, mappings = DEFAULT_COMPONENT_MAP) {
  let output = String(source || "");
  for (const [sourceName, componentName] of Object.entries(mappings)) {
    const escapedName = sourceName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    output = output.replace(new RegExp(`(<\\/?)(?:${escapedName})(?=[\\s/>])`, "g"), `$1${componentName}`);
  }
  return output;
}
