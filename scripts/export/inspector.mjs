import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "parse5";

const staticRoutes = [
  { route: "/", kind: "page" },
  { route: "/about", kind: "page" },
  { route: "/career", kind: "page" },
  { route: "/contact", kind: "page" },
  { route: "/devlog", kind: "list", cardClass: "devlog-card" },
  { route: "/journal", kind: "list", cardClass: "devlog-card" },
  { route: "/projects", kind: "list", cardClass: "project-card" },
];

export class ExportValidationError extends Error {
  constructor(message, report) {
    super(message);
    this.name = "ExportValidationError";
    this.report = report;
  }
}

function routeSegments(route) {
  if (route === "/") return [];
  if (!/^\/(?:[^/.]+\/)*[^/.]+$/u.test(route)) throw new Error(`invalid export route ${route}`);
  return route.slice(1).split("/");
}

function descendants(node) {
  return (node.childNodes ?? []).flatMap((child) => [child, ...descendants(child)]);
}

function attribute(node, name) {
  return node.attrs?.find((candidate) => candidate.name === name)?.value ?? "";
}

function textContent(node) {
  if (node.nodeName === "#text") return node.value;
  if (node.tagName === "script" || node.tagName === "style") return "";
  return (node.childNodes ?? []).map(textContent).join("");
}

function normalizedText(node) {
  return textContent(node).replace(/\s+/gu, " ").trim();
}

function hasClass(node, className) {
  return attribute(node, "class").split(/\s+/u).includes(className);
}

function contentContainer(heading) {
  let ancestor = heading.parentNode;
  while (ancestor && !["article", "body", "main"].includes(ancestor.tagName)) ancestor = ancestor.parentNode;
  return ancestor;
}

function singleValue(nodes, route, field, predicate, value) {
  const matches = nodes.filter(predicate);
  if (matches.length !== 1) throw new Error(`${route}: ${field} expected once, found ${matches.length}`);
  const result = value(matches[0]).trim();
  if (!result) throw new Error(`${route}: ${field} is missing or empty`);
  return result;
}

function canonicalBasePath() {
  const raw = process.env.BASE_PATH;
  if (!raw || raw === "ROOT") return "";
  return `/${raw.replace(/^\/+|\/+$/gu, "")}`;
}

function expectedCanonical(siteUrl, route) {
  return `${siteUrl.replace(/\/$/u, "")}${canonicalBasePath()}${route === "/" ? "" : route}`;
}

function inspectMetadata(html, route, siteUrl) {
  const nodes = descendants(parse(html));
  const title = singleValue(nodes, route, "title", (node) => node.tagName === "title", normalizedText);
  singleValue(nodes, route, "description", (node) => node.tagName === "meta" && attribute(node, "name") === "description", (node) => attribute(node, "content"));
  const canonical = singleValue(nodes, route, "canonical", (node) => node.tagName === "link" && attribute(node, "rel") === "canonical", (node) => attribute(node, "href"));
  singleValue(nodes, route, "og:title", (node) => node.tagName === "meta" && attribute(node, "property") === "og:title", (node) => attribute(node, "content"));
  singleValue(nodes, route, "og:description", (node) => node.tagName === "meta" && attribute(node, "property") === "og:description", (node) => attribute(node, "content"));
  singleValue(nodes, route, "og:url", (node) => node.tagName === "meta" && attribute(node, "property") === "og:url", (node) => attribute(node, "content"));
  const twitterCard = singleValue(nodes, route, "twitter:card", (node) => node.tagName === "meta" && attribute(node, "name") === "twitter:card", (node) => attribute(node, "content"));
  singleValue(nodes, route, "twitter:title", (node) => node.tagName === "meta" && attribute(node, "name") === "twitter:title", (node) => attribute(node, "content"));
  singleValue(nodes, route, "twitter:description", (node) => node.tagName === "meta" && attribute(node, "name") === "twitter:description", (node) => attribute(node, "content"));
  const jsonLd = nodes
    .filter((node) => node.tagName === "script" && attribute(node, "type") === "application/ld+json")
    .map((node, index) => {
      const raw = (node.childNodes ?? []).map((child) => child.nodeName === "#text" ? child.value : "").join("");
      if (raw.includes("<")) throw new Error(`${route}: json-ld[${index}] contains unsafe raw <`);
      try {
        const document = JSON.parse(raw);
        if (!document || typeof document !== "object" || Array.isArray(document) || typeof document["@context"] !== "string" || typeof document["@type"] !== "string") {
          throw new Error(`${route}: json-ld[${index}] has no schema context or type`);
        }
        return document;
      } catch (error) {
        if (error instanceof SyntaxError) throw new Error(`${route}: json-ld[${index}] is malformed`);
        throw error;
      }
    });

  if (canonical !== expectedCanonical(siteUrl, route)) throw new Error(`${route}: canonical does not match route`);
  if (twitterCard !== "summary") throw new Error(`${route}: twitter:card must be summary`);
  return { title, canonical, jsonLd };
}

function inspectBody(html, contract) {
  const nodes = descendants(parse(html));
  const headings = nodes.filter((node) => node.tagName === "h1");
  if (headings.length === 0) throw new Error(`${contract.route}: expected H1`);
  const heading = normalizedText(headings[0]);
  if (!heading) throw new Error(`${contract.route}: H1 is empty`);
  const content = contentContainer(headings[0]) ?? nodes.find((node) => node.tagName === "body");
  const excerpt = content ? normalizedText(content) : "";
  if (contract.kind === "list") {
    if (!nodes.some((node) => hasClass(node, contract.cardClass))) {
      if (nodes.some((node) => hasClass(node, "loading-placeholder"))) throw new Error(`${contract.route}: list output contains only Loading fallback`);
      throw new Error(`${contract.route}: list output contains no visible cards`);
    }
  }
  if (excerpt.length < heading.length + 8) throw new Error(`${contract.route}: body excerpt is missing`);
  return { heading, excerpt };
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function routeContracts(root) {
  const dataRoot = path.join(root, "src", "data");
  const [projectsData, devlogData] = await Promise.all([
    readJson(path.join(dataRoot, "indexes", "projects.json")),
    readJson(path.join(dataRoot, "indexes", "devlog-recommendations.json")),
  ]);
  if (!Array.isArray(projectsData.projects)) throw new Error("projects index has no projects array");
  if (!Array.isArray(devlogData.pages)) throw new Error("devlog index has no pages array");
  const projects = projectsData.projects.map((project) => {
    const id = project.slug || project.id;
    if (typeof id !== "string" || typeof project.title !== "string") throw new Error("projects index contains an invalid detail route");
    return { route: `/projects/${id}`, kind: "detail", heading: project.title, detailKind: "project" };
  });
  const devlogs = devlogData.pages.map((entry) => {
    if (typeof entry.href !== "string" || typeof entry.title !== "string") throw new Error("devlog index contains an invalid detail route");
    routeSegments(entry.href);
    return { route: entry.href, kind: "detail", heading: entry.title, detailKind: "devlog" };
  });
  return [...staticRoutes, ...projects, ...devlogs, { route: "/404", kind: "not-found", file: "404.html" }];
}

function relativeOutputPath(outputRoot, file) {
  return path.relative(outputRoot, file).replaceAll(path.sep, "/");
}

export async function resolveExportFile(outputRoot, route, fixedFile) {
  const candidates = fixedFile
    ? [path.join(outputRoot, fixedFile)]
    : route === "/"
      ? [path.join(outputRoot, "index.html")]
      : [
          path.join(outputRoot, ...routeSegments(route), "index.html"),
          path.join(outputRoot, `${routeSegments(route).join(path.sep)}.html`),
        ];
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Probe the next valid static-export layout.
    }
  }
  throw new Error(`${route}: output is missing (expected ${candidates.map((candidate) => relativeOutputPath(outputRoot, candidate)).join(" or ")})`);
}

function validateDetailJsonLd(contract, jsonLd) {
  if (contract.detailKind !== "devlog") return;
  const document = jsonLd.find((entry) => entry["@type"] === "BlogPosting");
  if (!document) throw new Error(`${contract.route}: BlogPosting JSON-LD is missing`);
}

async function inspectRoute(outputRoot, contract, siteUrl) {
  const file = await resolveExportFile(outputRoot, contract.route, contract.file);
  const html = await readFile(file, "utf8");
  const body = inspectBody(html, contract);
  const metadata = contract.kind === "not-found" ? null : inspectMetadata(html, contract.route, siteUrl);
  if (metadata) validateDetailJsonLd(contract, metadata.jsonLd);
  return { route: contract.route, file: relativeOutputPath(outputRoot, file), kind: contract.kind, heading: body.heading, status: "PASS", metadata };
}

export async function validateStaticExport({ root = process.cwd(), outputRoot = path.join(root, "out"), reportPath } = {}) {
  const [site, contracts] = await Promise.all([
    readJson(path.join(root, "src", "data", "config", "site.json")),
    routeContracts(root),
  ]);
  if (typeof site.siteUrl !== "string" || !site.siteUrl) throw new Error("site config has no siteUrl");
  const routes = await Promise.all(contracts.map(async (contract) => {
    try {
      return await inspectRoute(outputRoot, contract, site.siteUrl);
    } catch (error) {
      return { route: contract.route, kind: contract.kind, status: "FAIL", error: error instanceof Error ? error.message : String(error) };
    }
  }));
  const passedRoutes = routes.filter((route) => route.status === "PASS" && route.metadata);
  const duplicateTitles = passedRoutes.find((route, index) => passedRoutes.findIndex((candidate) => candidate.metadata.title === route.metadata.title) !== index);
  const duplicateCanonicals = passedRoutes.find((route, index) => passedRoutes.findIndex((candidate) => candidate.metadata.canonical === route.metadata.canonical) !== index);
  if (duplicateTitles) routes.push({ route: duplicateTitles.route, kind: duplicateTitles.kind, status: "FAIL", error: `${duplicateTitles.route}: title duplicates another route` });
  if (duplicateCanonicals) routes.push({ route: duplicateCanonicals.route, kind: duplicateCanonicals.kind, status: "FAIL", error: `${duplicateCanonicals.route}: canonical duplicates another route` });
  const failures = routes.filter((route) => route.status === "FAIL");
  const report = { verdict: failures.length === 0 ? "PASS" : "FAIL", route_count: contracts.length, blocker_count: failures.length, routes };
  if (reportPath) {
    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  }
  if (failures.length > 0) throw new ExportValidationError(failures.map((failure) => failure.error).join("\n"), report);
  return report;
}
