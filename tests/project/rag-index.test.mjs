import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  appendIndexingWorklog,
  buildDocumentIndex,
  serializeDocumentIndex,
} from "../../scripts/wiki/build-rag-index.mjs";

const temporaryRoots = [];

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "blog-rag-index-"));
  temporaryRoots.push(root);
  fs.mkdirSync(path.join(root, "wiki", "reports"), { recursive: true });
  fs.mkdirSync(path.join(root, "wiki", "worklogs"), { recursive: true });
  fs.writeFileSync(path.join(root, "AGENTS.md"), "# Agent Harness\n\n## Start Here\n", "utf8");
  fs.writeFileSync(path.join(root, "wiki", "policy.md"), "# Policy\n\n## Rule\n", "utf8");
  fs.writeFileSync(path.join(root, "wiki", "reports", "gate.md"), "# Gate Report\n", "utf8");
  fs.writeFileSync(path.join(root, "wiki", "session-memory.md"), "# Session Memory\n", "utf8");
  fs.writeFileSync(path.join(root, "wiki", "worklogs", "README.md"), "# Worklogs\n", "utf8");
  fs.writeFileSync(path.join(root, "wiki", "worklogs", "indexing.jsonl"), "", "utf8");

  return {
    root,
    registry: {
      schemaVersion: 1,
      groups: [
        {
          id: "agent-harness",
          role: "entrypoint",
          authority: 100,
          retrieval: "default",
          sources: [{ path: "AGENTS.md", type: "file", extensions: [".md"] }],
        },
        {
          id: "project-wiki",
          role: "canonical",
          authority: 90,
          retrieval: "default",
          sources: [{ path: "wiki/policy.md", type: "file", extensions: [".md"] }],
        },
        {
          id: "project-reports",
          role: "evidence",
          authority: 50,
          retrieval: "secondary",
          sources: [{ path: "wiki/reports", type: "directory", extensions: [".md"] }],
        },
        {
          id: "project-worklogs",
          role: "worklog",
          authority: 10,
          retrieval: "history-only",
          sources: [
            { path: "wiki/session-memory.md", type: "file", extensions: [".md"] },
            { path: "wiki/worklogs", type: "directory", extensions: [".md"] },
          ],
        },
      ],
    },
  };
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("RAG document index", () => {
  it("classifies canonical, evidence, and worklog documents without overlap", () => {
    const { registry, root } = createFixture();
    const index = buildDocumentIndex({ registry, root });
    const groupsByPath = Object.fromEntries(
      index.documents.map((document) => [document.path, document.sourceGroup]),
    );

    expect(groupsByPath).toMatchObject({
      "AGENTS.md": "agent-harness",
      "wiki/policy.md": "project-wiki",
      "wiki/reports/gate.md": "project-reports",
      "wiki/session-memory.md": "project-worklogs",
      "wiki/worklogs/README.md": "project-worklogs",
    });
    expect(groupsByPath["wiki/worklogs/indexing.jsonl"]).toBeUndefined();
    expect(index.documents.find(({ path: value }) => value === "wiki/session-memory.md")).not.toHaveProperty(
      "sha256",
    );
    expect(new Set(index.documents.map(({ path: documentPath }) => documentPath)).size).toBe(
      index.documents.length,
    );
  });

  it("produces byte-identical output for unchanged inputs", () => {
    const { registry, root } = createFixture();

    expect(serializeDocumentIndex(buildDocumentIndex({ registry, root }))).toBe(
      serializeDocumentIndex(buildDocumentIndex({ registry, root })),
    );
  });

  it("does not stale the catalog when append-only history changes", () => {
    const { registry, root } = createFixture();
    const before = serializeDocumentIndex(buildDocumentIndex({ registry, root }));
    fs.appendFileSync(path.join(root, "wiki", "session-memory.md"), "\n## New Session\n", "utf8");

    expect(serializeDocumentIndex(buildDocumentIndex({ registry, root }))).toBe(before);
  });

  it("rejects documents assigned to more than one source group", () => {
    const { registry, root } = createFixture();
    registry.groups[1].sources.push({ path: "AGENTS.md", type: "file", extensions: [".md"] });

    expect(() => buildDocumentIndex({ registry, root })).toThrow(/multiple source groups/i);
  });

  it("rejects registry sources that escape the repository root", () => {
    const { registry, root } = createFixture();
    registry.groups[0].sources = [{ path: "../outside.md", type: "file", extensions: [".md"] }];

    expect(() => buildDocumentIndex({ registry, root })).toThrow(/outside repository root/i);
  });

  it("records added, updated, and removed documents in an indexing worklog", () => {
    const { registry, root } = createFixture();
    const previous = buildDocumentIndex({ registry, root });
    fs.writeFileSync(path.join(root, "wiki", "policy.md"), "# Policy\n\n## Updated Rule\n", "utf8");
    fs.rmSync(path.join(root, "wiki", "reports", "gate.md"));
    fs.writeFileSync(path.join(root, "wiki", "reports", "new.md"), "# New Report\n", "utf8");
    const current = buildDocumentIndex({ registry, root });
    const worklogPath = path.join(root, "wiki", "worklogs", "indexing.jsonl");

    const event = appendIndexingWorklog({
      current,
      indexedAt: "2026-08-12T00:00:00.000Z",
      previous,
      runId: "test-run",
      worklogPath,
    });

    expect(event.changes).toEqual({
      added: ["wiki/reports/new.md"],
      updated: ["wiki/policy.md"],
      removed: ["wiki/reports/gate.md"],
    });
    expect(JSON.parse(fs.readFileSync(worklogPath, "utf8").trim())).toEqual(event);
  });

  it("records source-group metadata changes as document updates", () => {
    const { registry, root } = createFixture();
    const previous = buildDocumentIndex({ registry, root });
    registry.groups[1].authority = 80;
    const current = buildDocumentIndex({ registry, root });

    const event = appendIndexingWorklog({
      current,
      indexedAt: "2026-08-12T00:00:00.000Z",
      previous,
      runId: "metadata-change",
      worklogPath: path.join(root, "wiki", "worklogs", "indexing.jsonl"),
    });

    expect(event.changes.updated).toContain("wiki/policy.md");
  });
});
