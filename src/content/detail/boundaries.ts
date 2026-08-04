import { existsSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import type { ProjectDetail, ProjectSection, ProjectTab } from "../../types";

export type DetailContentRoots = {
  readonly repository: string;
  readonly devlog: string;
  readonly project: string;
};

export type DetailBoundaryError =
  | {
      readonly kind: "invalid_source";
      readonly sourceFile: string;
      readonly reason: "absolute" | "outside_root" | "not_file";
    }
  | {
      readonly kind: "missing_source";
      readonly sourceFile: string;
    }
  | {
      readonly kind: "invalid_legacy_detail";
      readonly field: string;
    };

export type DetailBoundaryResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: DetailBoundaryError };

export function createDetailContentRoots(repositoryRoot: string): DetailContentRoots {
  return {
    repository: path.resolve(repositoryRoot),
    devlog: path.resolve(repositoryRoot, "src", "content", "devlog"),
    project: path.resolve(repositoryRoot, "src", "content", "projects"),
  };
}

export function resolveDevlogDetailSource(
  sourceFile: string,
  roots: DetailContentRoots,
): DetailBoundaryResult<string> {
  return resolveDetailSource(sourceFile, roots.devlog, roots.repository);
}

export function resolveProjectDetailSource(
  sourceFile: string,
  roots: DetailContentRoots,
): DetailBoundaryResult<string> {
  return resolveDetailSource(sourceFile, roots.project, roots.repository);
}

export function parseLegacyProjectDetail(value: unknown): DetailBoundaryResult<ProjectDetail> {
  const decoded = decodeLegacyDetail(value);
  if (!decoded.ok) return decoded;
  if (!isRecord(decoded.value)) return invalidLegacyDetail("root");

  const id = requiredString(decoded.value, "id");
  if (!id.ok) return id;
  const projectId = optionalString(decoded.value, "project_id");
  if (!projectId.ok) return projectId;
  const overview = optionalString(decoded.value, "overview");
  if (!overview.ok) return overview;
  const techStack = optionalStringList(decoded.value, "tech_stack");
  if (!techStack.ok) return techStack;
  const sections = optionalSections(decoded.value, "sections");
  if (!sections.ok) return sections;
  const tabs = optionalTabs(decoded.value, "tabs");
  if (!tabs.ok) return tabs;
  const diagram = optionalString(decoded.value, "diagram");
  if (!diagram.ok) return diagram;
  const reference = optionalString(decoded.value, "reference");
  if (!reference.ok) return reference;
  const flowDiagram = optionalString(decoded.value, "flow_diagram");
  if (!flowDiagram.ok) return flowDiagram;

  return {
    ok: true,
    value: {
      id: id.value,
      project_id: projectId.value,
      overview: overview.value,
      tech_stack: techStack.value,
      sections: sections.value,
      tabs: tabs.value,
      diagram: diagram.value,
      reference: reference.value,
      flow_diagram: flowDiagram.value,
    },
  };
}

function resolveDetailSource(
  sourceFile: string,
  root: string,
  repositoryRoot: string,
): DetailBoundaryResult<string> {
  if (isAbsolutePath(sourceFile)) {
    return invalidSource(sourceFile, "absolute");
  }

  const candidate = sourceFile.startsWith("src/content/")
    ? path.resolve(repositoryRoot, sourceFile)
    : path.resolve(root, sourceFile);
  if (!isWithinRoot(candidate, root)) {
    return invalidSource(sourceFile, "outside_root");
  }
  if (!existsSync(candidate)) {
    return { ok: false, error: { kind: "missing_source", sourceFile } };
  }
  if (!statSync(candidate).isFile()) {
    return invalidSource(sourceFile, "not_file");
  }

  const resolvedRoot = realpathSync(root);
  const resolvedCandidate = realpathSync(candidate);
  if (!isWithinRoot(resolvedCandidate, resolvedRoot)) {
    return invalidSource(sourceFile, "outside_root");
  }
  return { ok: true, value: resolvedCandidate };
}

function decodeLegacyDetail(value: unknown): DetailBoundaryResult<unknown> {
  if (typeof value !== "string") return { ok: true, value };

  try {
    return { ok: true, value: JSON.parse(value) };
  } catch (error) {
    if (error instanceof SyntaxError) return invalidLegacyDetail("json");
    throw error;
  }
}

function optionalTabs(
  record: Record<string, unknown>,
  field: string,
): DetailBoundaryResult<readonly ProjectTab[]> {
  if (!Object.hasOwn(record, field)) return { ok: true, value: [] };
  const value = record[field];
  if (!Array.isArray(value)) return invalidLegacyDetail(field);

  const tabs: ProjectTab[] = [];
  for (const [index, tab] of value.entries()) {
    if (!isRecord(tab)) return invalidLegacyDetail(`${field}[${index}]`);
    const title = requiredString(tab, "title");
    if (!title.ok) return title;
    const sections = optionalSections(tab, "sections", false);
    if (!sections.ok) return sections;
    const reference = optionalString(tab, "reference");
    if (!reference.ok) return reference;
    const flowDiagram = optionalString(tab, "flow_diagram");
    if (!flowDiagram.ok) return flowDiagram;
    tabs.push({
      title: title.value,
      sections: sections.value,
      reference: reference.value,
      flow_diagram: flowDiagram.value,
    });
  }
  return { ok: true, value: tabs };
}

function optionalSections(
  record: Record<string, unknown>,
  field: string,
  allowMissing = true,
): DetailBoundaryResult<readonly ProjectSection[]> {
  if (!Object.hasOwn(record, field)) {
    return allowMissing ? { ok: true, value: [] } : invalidLegacyDetail(field);
  }
  const value = record[field];
  if (!Array.isArray(value)) return invalidLegacyDetail(field);

  const sections: ProjectSection[] = [];
  for (const [index, section] of value.entries()) {
    if (!isRecord(section)) return invalidLegacyDetail(`${field}[${index}]`);
    const title = requiredString(section, "title");
    if (!title.ok) return title;
    const body = optionalString(section, "body");
    if (!body.ok) return body;
    const list = optionalStringList(section, "list");
    if (!list.ok) return list;
    sections.push({ title: title.value, body: body.value, list: list.value });
  }
  return { ok: true, value: sections };
}

function optionalStringList(
  record: Record<string, unknown>,
  field: string,
): DetailBoundaryResult<readonly string[]> {
  if (!Object.hasOwn(record, field)) return { ok: true, value: [] };
  const value = record[field];
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    return invalidLegacyDetail(field);
  }
  return { ok: true, value };
}

function requiredString(record: Record<string, unknown>, field: string): DetailBoundaryResult<string> {
  if (!Object.hasOwn(record, field)) return invalidLegacyDetail(field);
  const value = record[field];
  if (typeof value !== "string" || value.trim().length === 0) return invalidLegacyDetail(field);
  return { ok: true, value };
}

function optionalString(
  record: Record<string, unknown>,
  field: string,
): DetailBoundaryResult<string | undefined> {
  if (!Object.hasOwn(record, field)) return { ok: true, value: undefined };
  const value = record[field];
  if (typeof value !== "string") return invalidLegacyDetail(field);
  return { ok: true, value };
}

function invalidSource(
  sourceFile: string,
  reason: "absolute" | "outside_root" | "not_file",
): DetailBoundaryResult<never> {
  return { ok: false, error: { kind: "invalid_source", sourceFile, reason } };
}

function invalidLegacyDetail(field: string): DetailBoundaryResult<never> {
  return { ok: false, error: { kind: "invalid_legacy_detail", field } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAbsolutePath(value: string): boolean {
  return path.isAbsolute(value) || path.posix.isAbsolute(value) || path.win32.isAbsolute(value);
}

function isWithinRoot(candidate: string, root: string): boolean {
  const relative = path.relative(root, candidate);
  return relative.length > 0 && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}
