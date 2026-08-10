import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { acquireContentLock } from "../../scripts/notion/connect/content-transaction.mjs";
import { main } from "../../scripts/notion/connect/fetch.mjs";

const ids = {
  journal: "11111111111111111111111111111111",
  devlog: "22222222222222222222222222222222",
  project: "33333333333333333333333333333333",
};
const generatedPaths = [
  "src/data/config/routes.json",
  "src/data/config/slugs.json",
  "src/data/indexes/devlog-recommendations.json",
  "src/data/indexes/devlog.json",
  "src/data/indexes/journal.json",
  "src/data/indexes/projects.json",
];
const roots = [];

function fixtureRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "notion-fetch-orchestration-"));
  roots.push(root);
  for (const relativePath of generatedPaths) {
    const filePath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `old:${relativePath}`);
  }
  return root;
}

function configuredEnv(extra = {}) {
  return {
    NOTION_TOKEN: "fixture-token",
    NOTION_REQUIRED_GROUPS: "journal,devlog,project",
    NOTION_PAGE_ID_JOURNAL: ids.journal,
    NOTION_PAGE_ID_DEVLOG: ids.devlog,
    NOTION_PAGE_ID_PROJECT: ids.project,
    ...extra,
  };
}

function oldManifest(root) {
  return Object.fromEntries(generatedPaths.map((relativePath) => [
    relativePath,
    crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relativePath))).digest("hex"),
  ]));
}

function page(sourceId) {
  return { id: sourceId, properties: {}, last_edited_time: "2026-08-05T00:00:00.000Z" };
}

function writeGenerated(stageRoot, value = "new") {
  for (const relativePath of generatedPaths) {
    const filePath = path.join(stageRoot, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${value}:${relativePath}`);
  }
}

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { force: true, recursive: true });
});

describe("Notion fetch orchestration", () => {
  it("Given three complete groups When fetch succeeds Then one exact staged manifest is committed after validation", async () => {
    // Given
    const root = fixtureRoot();
    const events = [];
    const staleMarker = path.join(root, ".notion-content-transaction", "stale-marker");
    fs.mkdirSync(path.dirname(staleMarker));
    fs.writeFileSync(staleMarker, "stale");
    const contentPaths = Object.fromEntries(Object.keys(ids).map((group) => [
      group,
      `src/content/${group === "project" ? "projects" : "devlog"}/fixture/${group}.mdx`,
    ]));
    const createClient = () => {
      expect(fs.existsSync(staleMarker)).toBe(false);
      expect(() => acquireContentLock(root)).toThrow(/lock/i);
      events.push("client");
      return { queryCollection: async (sourceId) => [page(sourceId)] };
    };
    const syncPageContentFn = async (_client, group, rows, options) => {
      events.push(`write:${group}`);
      expect(rows).toHaveLength(1);
      const relativePath = contentPaths[group];
      const filePath = path.join(options.root, relativePath);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, `new:${group}`);
      return { managedPaths: [relativePath] };
    };

    // When
    const result = await main({
      root,
      env: configuredEnv(),
      createClient,
      syncPageContentFn,
      generateContent(stageRoot) {
        events.push("generate");
        writeGenerated(stageRoot);
      },
      validateContent(stageRoot) {
        events.push("validate");
        expect(fs.readFileSync(path.join(stageRoot, generatedPaths[0]), "utf8")).toContain("new:");
        expect(fs.readFileSync(path.join(root, generatedPaths[0]), "utf8")).toContain("old:");
      },
    });

    // Then
    expect(result.state).toBe("committed");
    expect(result.manifest.map((entry) => entry.path)).toEqual([
      ...Object.values(contentPaths),
      ...generatedPaths,
    ].sort());
    expect(events).toEqual(["client", "write:journal", "write:devlog", "write:project", "generate", "validate"]);
    expect(fs.existsSync(path.join(root, ".notion-content.lock"))).toBe(false);
    expect(fs.existsSync(path.join(root, ".notion-content-transaction"))).toBe(false);
  });

  it("Given a missing required group When startup runs Then recovery precedes configuration failure and no client or writer runs", async () => {
    // Given
    const root = fixtureRoot();
    const before = oldManifest(root);
    fs.mkdirSync(path.join(root, ".notion-content-transaction"));
    let clientCalls = 0;
    let writerCalls = 0;
    const env = configuredEnv({ NOTION_PAGE_ID_PROJECT: undefined });

    // When
    const action = main({
      root,
      env,
      createClient() { clientCalls += 1; },
      syncPageContentFn() { writerCalls += 1; },
    });

    // Then
    await expect(action).rejects.toThrow(/required.*project/i);
    expect(clientCalls).toBe(0);
    expect(writerCalls).toBe(0);
    expect(oldManifest(root)).toEqual(before);
    expect(fs.existsSync(path.join(root, ".notion-content-transaction"))).toBe(false);
  });

  it.each([
    ["auth failure", () => { throw new Error("401 unauthorized"); }],
    ["network failure", () => { throw new Error("fetch failed"); }],
    ["partial group failure", (sourceId) => sourceId === ids.project ? Promise.reject(new Error("partial")) : [page(sourceId)]],
    ["zero rows", () => []],
    ["malformed response", () => ({ results: "untrusted" })],
  ])("Given %s When sources are queried Then no writer runs and prior bytes remain", async (_scenario, queryCollection) => {
    // Given
    const root = fixtureRoot();
    const before = oldManifest(root);
    let writerCalls = 0;

    // When
    const action = main({
      root,
      env: configuredEnv(),
      createClient: () => ({ queryCollection }),
      syncPageContentFn() { writerCalls += 1; },
    });

    // Then
    await expect(action).rejects.toThrow();
    expect(writerCalls).toBe(0);
    expect(oldManifest(root)).toEqual(before);
  });

  it("Given CI and allow-empty When fetch starts Then it fails before client construction", async () => {
    // Given
    const root = fixtureRoot();
    let clientCalls = 0;

    // When
    const action = main({
      root,
      env: configuredEnv({ CI: "true" }),
      allowEmpty: true,
      createClient() { clientCalls += 1; },
    });

    // Then
    await expect(action).rejects.toThrow(/allow-empty.*CI/i);
    expect(clientCalls).toBe(0);
  });

  it("Given malformed generated data When staging validation fails Then promotion preserves prior bytes", async () => {
    // Given
    const root = fixtureRoot();
    const before = oldManifest(root);

    // When
    const action = main({
      root,
      env: configuredEnv(),
      createClient: () => ({ queryCollection: async (sourceId) => [page(sourceId)] }),
      syncPageContentFn: async () => ({ managedPaths: [] }),
      generateContent(stageRoot) {
        for (const relativePath of generatedPaths) {
          const filePath = path.join(stageRoot, relativePath);
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          fs.writeFileSync(filePath, relativePath.endsWith("journal.json") ? "{ malformed" : "{}\n");
        }
      },
    });

    // Then
    await expect(action).rejects.toThrow(/journal\.json: invalid JSON/);
    expect(oldManifest(root)).toEqual(before);
  });

  it("Given a writer claims success without a manifest When staging runs Then promotion fails closed", async () => {
    // Given
    const root = fixtureRoot();
    const before = oldManifest(root);

    // When
    const action = main({
      root,
      env: configuredEnv(),
      createClient: () => ({ queryCollection: async (sourceId) => [page(sourceId)] }),
      syncPageContentFn: async () => undefined,
    });

    // Then
    await expect(action).rejects.toThrow(/malformed writer result/i);
    expect(oldManifest(root)).toEqual(before);
  });

  it("Given an unknown Notion column When fetch starts Then quarantine is written and no writer runs", async () => {
    // Given
    const root = fixtureRoot();
    let writerCalls = 0;

    // When
    const action = main({
      root,
      env: configuredEnv(),
      createClient: () => ({ queryCollection: async () => [{
        id: ids.journal,
        properties: {
          title: { type: "title", title: [{ plain_text: "Fixture" }] },
          category: { type: "select", select: { name: "personal" } },
          created_date: { type: "date", date: { start: "2026-08-01" } },
          unsafe_column: { type: "rich_text", rich_text: [] },
        },
      }] }),
      syncPageContentFn() { writerCalls += 1; },
    });

    // Then
    await expect(action).rejects.toThrow(/quarantine/i);
    expect(writerCalls).toBe(0);
    expect(fs.existsSync(path.join(root, "artifacts/notion-quarantine/report.json"))).toBe(true);
  });

  it("Given a hung writer owns the lock When another fetch starts Then it cannot construct a client", async () => {
    // Given
    const root = fixtureRoot();
    const lock = acquireContentLock(root);
    let clientCalls = 0;

    try {
      // When
      const action = main({
        root,
        env: configuredEnv(),
        createClient() { clientCalls += 1; },
      });

      // Then
      await expect(action).rejects.toThrow(/lock is held/i);
      expect(clientCalls).toBe(0);
    } finally {
      lock.release();
    }
  });
});
