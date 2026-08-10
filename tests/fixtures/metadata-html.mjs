import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "parse5";

const siteUrl = "https://rlaguswls13.github.io";
const profile = JSON.parse(readFileSync("src/data/pages/main/profile.json", "utf8"));
const exportBasePath = process.env.METADATA_BASE_PATH ?? "";
const recommendations = JSON.parse(readFileSync("src/data/indexes/devlog-recommendations.json", "utf8"));
const projects = JSON.parse(readFileSync("src/data/indexes/projects.json", "utf8"));
const representativeDevlog = recommendations.pages.find((page) => page.id === "36819946ca7680ad822eeb9d40d24cdb");
const representativeProject = projects.projects[0];

if (!representativeDevlog) throw new Error("metadata fixture: missing representative devlog");
if (!representativeProject) throw new Error("metadata fixture: missing representative project");

export const metadataRouteContracts = [
  { route: "/", file: "index.html", kind: "root", expectedDescription: null },
  { route: "/about", file: "about.html", kind: "static", expectedDescription: null },
  { route: "/career", file: "career.html", kind: "static", expectedDescription: null },
  { route: "/contact", file: "contact.html", kind: "static", expectedDescription: null },
  { route: "/devlog", file: "devlog.html", kind: "list", expectedDescription: null },
  { route: "/journal", file: "journal.html", kind: "list", expectedDescription: null },
  { route: "/projects", file: "projects.html", kind: "list", expectedDescription: null },
  {
    route: representativeDevlog.href,
    file: `${representativeDevlog.href.slice(1)}.html`,
    kind: "devlog-detail",
    expectedDescription: representativeDevlog.description,
    expectedPublishedTime: representativeDevlog.date,
    expectedAuthor: representativeDevlog.author || profile.profile.name,
  },
  {
    route: `/projects/${representativeProject.slug || representativeProject.id}`,
    file: `projects/${representativeProject.slug || representativeProject.id}.html`,
    kind: "project-detail",
    expectedDescription: representativeProject.description,
  },
].map((contract) => ({
  ...contract,
  expectedCanonical: `${siteUrl}${exportBasePath}${contract.route === "/" ? "" : contract.route}`,
}));

function descendants(node) {
  const nodes = [];
  for (const child of node.childNodes ?? []) nodes.push(child, ...descendants(child));
  return nodes;
}

function attribute(node, name) {
  return node.attrs?.find((candidate) => candidate.name === name)?.value ?? null;
}

function textContent(node) {
  if (node.nodeName === "#text") return node.value;
  return (node.childNodes ?? []).map(textContent).join("");
}

function singleValue(nodes, route, field, predicate, value) {
  const matches = nodes.filter(predicate);
  if (matches.length !== 1) throw new Error(`${route}: ${field} expected once, found ${matches.length}`);
  const result = value(matches[0]);
  if (!result?.trim()) throw new Error(`${route}: ${field} is missing or empty`);
  return result.trim();
}

export function inspectRouteMetadata(html, contract) {
  const nodes = descendants(parse(html));
  const title = singleValue(nodes, contract.route, "title", (node) => node.tagName === "title", textContent);
  const description = singleValue(nodes, contract.route, "description", (node) => node.tagName === "meta" && attribute(node, "name") === "description", (node) => attribute(node, "content"));
  const canonical = singleValue(nodes, contract.route, "canonical", (node) => node.tagName === "link" && attribute(node, "rel") === "canonical", (node) => attribute(node, "href"));
  const ogTitle = singleValue(nodes, contract.route, "og:title", (node) => node.tagName === "meta" && attribute(node, "property") === "og:title", (node) => attribute(node, "content"));
  const ogDescription = singleValue(nodes, contract.route, "og:description", (node) => node.tagName === "meta" && attribute(node, "property") === "og:description", (node) => attribute(node, "content"));
  const ogUrl = singleValue(nodes, contract.route, "og:url", (node) => node.tagName === "meta" && attribute(node, "property") === "og:url", (node) => attribute(node, "content"));
  const twitterCard = singleValue(nodes, contract.route, "twitter:card", (node) => node.tagName === "meta" && attribute(node, "name") === "twitter:card", (node) => attribute(node, "content"));
  const twitterTitle = singleValue(nodes, contract.route, "twitter:title", (node) => node.tagName === "meta" && attribute(node, "name") === "twitter:title", (node) => attribute(node, "content"));
  const twitterDescription = singleValue(nodes, contract.route, "twitter:description", (node) => node.tagName === "meta" && attribute(node, "name") === "twitter:description", (node) => attribute(node, "content"));
  const jsonLd = nodes
    .filter((node) => node.tagName === "script" && attribute(node, "type") === "application/ld+json")
    .map((node, index) => {
      const raw = textContent(node);
      if (raw.includes("<")) throw new Error(`${contract.route}: json-ld[${index}] contains unsafe raw <`);
      try {
        return JSON.parse(raw);
      } catch {
        throw new Error(`${contract.route}: json-ld[${index}] is malformed`);
      }
    });

  return { title, description, canonical, ogTitle, ogDescription, ogUrl, twitterCard, twitterTitle, twitterDescription, jsonLd };
}

export function requireRouteMetadata(html, contract) {
  const result = inspectRouteMetadata(html, contract);
  if (result.description === "작성된 내용이 없습니다.") throw new Error(`${contract.route}: description is a placeholder`);
  if (contract.expectedDescription !== null && result.description !== contract.expectedDescription) throw new Error(`${contract.route}: description does not match content source`);
  if (result.canonical !== contract.expectedCanonical) throw new Error(`${contract.route}: canonical expected ${contract.expectedCanonical}, received ${result.canonical}`);
  if (result.ogTitle !== result.title) throw new Error(`${contract.route}: og:title does not match title`);
  if (result.ogDescription !== result.description) throw new Error(`${contract.route}: og:description does not match description`);
  if (result.ogUrl !== result.canonical) throw new Error(`${contract.route}: og:url does not match canonical`);
  if (result.twitterCard !== "summary") throw new Error(`${contract.route}: twitter:card must be summary`);
  if (result.twitterTitle !== result.title) throw new Error(`${contract.route}: twitter:title does not match title`);
  if (result.twitterDescription !== result.description) throw new Error(`${contract.route}: twitter:description does not match description`);
  return result;
}

export function requireMetadataMatrix(rows) {
  const titles = new Set();
  for (const row of rows) {
    const metadata = requireRouteMetadata(row.html, row.contract);
    if (titles.has(metadata.title)) throw new Error(`${row.contract.route}: title duplicates another route`);
    titles.add(metadata.title);
  }
}

export function exportFile(exportRoot, contract) {
  return path.join(exportRoot, ...contract.file.split("/"));
}
