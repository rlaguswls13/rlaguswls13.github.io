import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_REGISTRY_PATH = "wiki/rag/source-registry.json";
const DEFAULT_INDEX_PATH = "wiki/rag/document-index.json";
const DEFAULT_WORKLOG_PATH = "wiki/worklogs/indexing.jsonl";
const RETRIEVAL_MODES = new Set(["default", "secondary", "history-only"]);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizePath(value) {
  return value.split(path.sep).join("/");
}

function isWithinRoot(root, candidate) {
  const relativePath = path.relative(root, candidate);
  return (
    relativePath === "" ||
    (relativePath !== ".." && !relativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(relativePath))
  );
}

function assertRegistry(registry) {
  if (registry?.schemaVersion !== 1 || !Array.isArray(registry.groups)) {
    throw new Error("RAG source registry must use schemaVersion 1 and define groups");
  }

  const ids = new Set();
  for (const group of registry.groups) {
    if (!group?.id || ids.has(group.id)) {
      throw new Error(`RAG source group id must be unique: ${group?.id ?? "missing"}`);
    }
    if (!Number.isInteger(group.authority) || !RETRIEVAL_MODES.has(group.retrieval)) {
      throw new Error(`RAG source group ${group.id} has invalid authority or retrieval mode`);
    }
    if (!Array.isArray(group.sources) || group.sources.length === 0) {
      throw new Error(`RAG source group ${group.id} must define sources`);
    }
    ids.add(group.id);
  }
}

function walkDirectory(directory, extensions) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkDirectory(entryPath, extensions);
    return entry.isFile() && extensions.has(path.extname(entry.name)) ? [entryPath] : [];
  });
}

function resolveSourceFiles(root, source) {
  const resolvedRoot = path.resolve(root);
  const absolutePath = path.resolve(resolvedRoot, source.path);
  if (!isWithinRoot(resolvedRoot, absolutePath)) {
    throw new Error(`RAG source path is outside repository root: ${source.path}`);
  }
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`RAG source path does not exist: ${source.path}`);
  }
  const realRoot = fs.realpathSync(resolvedRoot);
  const realSource = fs.realpathSync(absolutePath);
  if (!isWithinRoot(realRoot, realSource)) {
    throw new Error(`RAG source path resolves outside repository root: ${source.path}`);
  }
  const extensions = new Set(source.extensions ?? [".md"]);
  if (source.type === "file") {
    return extensions.has(path.extname(absolutePath)) ? [absolutePath] : [];
  }
  if (source.type === "directory") return walkDirectory(absolutePath, extensions);
  throw new Error(`RAG source ${source.path} has invalid type: ${source.type}`);
}

function markdownMetadata(content, fallbackTitle) {
  const headings = [];
  const anchorCounts = new Map();
  for (const line of content.split(/\r?\n/)) {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;
    const text = match[2].replace(/\s+#+$/, "").trim();
    const baseAnchor = text
      .toLocaleLowerCase("en-US")
      .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
      .trim()
      .replace(/\s+/g, "-");
    const count = anchorCounts.get(baseAnchor) ?? 0;
    anchorCounts.set(baseAnchor, count + 1);
    headings.push({
      level: match[1].length,
      text,
      anchor: count === 0 ? baseAnchor : `${baseAnchor}-${count}`,
    });
  }
  return { headings, title: headings.find(({ level }) => level === 1)?.text ?? fallbackTitle };
}

export function buildDocumentIndex({ registry, root }) {
  assertRegistry(registry);
  const owners = new Map();
  const documents = [];

  for (const group of registry.groups) {
    for (const source of group.sources) {
      for (const absolutePath of resolveSourceFiles(root, source)) {
        const relativePath = normalizePath(path.relative(root, absolutePath));
        const existingOwner = owners.get(relativePath);
        if (existingOwner) {
          throw new Error(
            `Document belongs to multiple source groups: ${relativePath} (${existingOwner}, ${group.id})`,
          );
        }
        owners.set(relativePath, group.id);
        const content = fs.readFileSync(absolutePath, "utf8");
        const metadata = markdownMetadata(content, path.basename(relativePath));
        const document = {
          path: relativePath,
          sourceGroup: group.id,
          role: group.role,
          authority: group.authority,
          retrieval: group.retrieval,
          title: metadata.title,
        };
        if (group.retrieval !== "history-only") {
          Object.assign(document, {
            headings: metadata.headings,
            bytes: Buffer.byteLength(content),
            sha256: sha256(content),
          });
        }
        documents.push(document);
      }
    }
  }

  documents.sort((left, right) => left.path.localeCompare(right.path, "en"));
  const groupCounts = Object.fromEntries(
    registry.groups.map((group) => [
      group.id,
      documents.filter(({ sourceGroup }) => sourceGroup === group.id).length,
    ]),
  );
  return {
    schemaVersion: 1,
    registrySha256: sha256(`${JSON.stringify(registry)}\n`),
    documentCount: documents.length,
    groupCounts,
    documents,
  };
}

export function serializeDocumentIndex(index) {
  return `${JSON.stringify(index, null, 2)}\n`;
}

function documentChanges(previous, current) {
  const previousByPath = new Map((previous?.documents ?? []).map((document) => [document.path, document]));
  const currentByPath = new Map(current.documents.map((document) => [document.path, document]));
  const added = current.documents.filter(({ path: value }) => !previousByPath.has(value)).map(({ path: value }) => value);
  const updated = current.documents
    .filter(
      (document) =>
        previousByPath.has(document.path) &&
        JSON.stringify(previousByPath.get(document.path)) !== JSON.stringify(document),
    )
    .map(({ path: value }) => value);
  const removed = [...previousByPath.keys()].filter((value) => !currentByPath.has(value)).sort();
  return { added, updated, removed };
}

export function appendIndexingWorklog({ current, indexedAt, previous, runId, worklogPath }) {
  const event = {
    schemaVersion: 1,
    runId,
    indexedAt,
    status: "success",
    registrySha256: current.registrySha256,
    indexSha256: sha256(serializeDocumentIndex(current)),
    documentCount: current.documentCount,
    groupCounts: current.groupCounts,
    changes: documentChanges(previous, current),
  };
  fs.mkdirSync(path.dirname(worklogPath), { recursive: true });
  fs.appendFileSync(worklogPath, `${JSON.stringify(event)}\n`, "utf8");
  return event;
}

function readJsonIfPresent(filePath) {
  return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : null;
}

function parseArguments(argumentsList) {
  return {
    check: argumentsList.includes("--check"),
    recordWorklog: argumentsList.includes("--record-worklog"),
    runId: argumentsList.find((argument) => argument.startsWith("--run-id="))?.slice(9),
  };
}

function runCli() {
  const root = process.cwd();
  const options = parseArguments(process.argv.slice(2));
  const registryPath = path.join(root, DEFAULT_REGISTRY_PATH);
  const indexPath = path.join(root, DEFAULT_INDEX_PATH);
  const worklogPath = path.join(root, DEFAULT_WORKLOG_PATH);
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  const previous = readJsonIfPresent(indexPath);
  const current = buildDocumentIndex({ registry, root });
  const serialized = serializeDocumentIndex(current);

  if (options.check) {
    if (!fs.existsSync(indexPath) || fs.readFileSync(indexPath, "utf8") !== serialized) {
      throw new Error("RAG document index is stale; run npm run wiki:index");
    }
    console.log(`[wiki:index] ${current.documentCount} documents are current`);
    return;
  }

  fs.writeFileSync(indexPath, serialized, "utf8");
  if (options.recordWorklog) {
    const indexedAt = new Date().toISOString();
    const runId = options.runId || `local-${indexedAt.replace(/[:.]/g, "-")}`;
    appendIndexingWorklog({ current, indexedAt, previous, runId, worklogPath });
  }
  console.log(`[wiki:index] wrote ${current.documentCount} documents`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    runCli();
  } catch (error) {
    console.error(`[wiki:index] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
