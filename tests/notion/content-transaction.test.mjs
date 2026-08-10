import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  acquireContentLock,
  promoteContentTransaction,
  recoverContentTransaction,
} from "../../scripts/notion/connect/content-transaction.mjs";
import { syncPageContent } from "../../scripts/notion/connect/sync-pages.mjs";

const managedPaths = [
  "src/content/devlog/fixture/one.mdx",
  "public/images/notion/two.png",
  "src/data/indexes/journal.json",
  "src/data/config/slugs.json",
];

function fixtureRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "notion-transaction-"));
  for (const relativePath of [...managedPaths, "src/content/devlog/unrelated.mdx"]) {
    const destination = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, `old:${relativePath}`);
  }
  return root;
}

function shaManifest(root) {
  return Object.fromEntries(managedPaths.map((relativePath) => [
    relativePath,
    crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relativePath))).digest("hex"),
  ]));
}

function prepareNew(stageRoot) {
  for (const relativePath of managedPaths) {
    const destination = path.join(stageRoot, relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, `new:${relativePath}`);
  }
}

describe("content transaction", () => {
  it("Given a mixed managed manifest When promotion commits Then only listed paths change", async () => {
    const root = fixtureRoot();
    const before = shaManifest(root);
    const unrelated = fs.readFileSync(path.join(root, "src/content/devlog/unrelated.mdx"), "utf8");

    await promoteContentTransaction({ root, managedPaths, prepare: prepareNew });

    expect(shaManifest(root)).not.toEqual(before);
    for (const relativePath of managedPaths) {
      expect(fs.readFileSync(path.join(root, relativePath), "utf8")).toBe(`new:${relativePath}`);
    }
    expect(fs.readFileSync(path.join(root, "src/content/devlog/unrelated.mdx"), "utf8")).toBe(unrelated);
    expect(fs.existsSync(path.join(root, ".notion-content-transaction"))).toBe(false);
    expect(fs.existsSync(path.join(root, ".notion-content.lock"))).toBe(false);
  });

  it.each(["write", "validation", "rename"])(
    "Given old bytes When %s fails Then rollback preserves the complete old manifest",
    async (failure) => {
      const root = fixtureRoot();
      const before = shaManifest(root);
      const prepare = failure === "write" ? () => { throw new Error("injected write"); } : prepareNew;
      const validate = failure === "validation" ? () => { throw new Error("injected validation"); } : undefined;
      const fault = failure === "rename" ? { throwAfterRename: 3 } : undefined;

      await expect(promoteContentTransaction({ root, managedPaths, prepare, validate, fault })).rejects.toThrow("injected");

      expect(shaManifest(root)).toEqual(before);
      expect(fs.existsSync(path.join(root, ".notion-content-transaction"))).toBe(false);
      expect(fs.existsSync(path.join(root, ".notion-content.lock"))).toBe(false);
    },
  );

  it("Given malformed or unlisted paths When parsed Then promotion fails closed", async () => {
    const root = fixtureRoot();
    for (const relativePath of ["../escape.mdx", "src/content/devlog/a.txt", "src/data/indexes/other.json"]) {
      await expect(promoteContentTransaction({ root, managedPaths: [relativePath], prepare() {} }))
        .rejects.toThrow(/managed path/i);
    }
  });

  it("Given an untrusted stale journal When recovery runs Then paths outside the root are untouched", async () => {
    const root = fixtureRoot();
    const outside = path.join(path.dirname(root), `${path.basename(root)}-sentinel.txt`);
    fs.writeFileSync(outside, "sentinel");
    const stateDirectory = path.join(root, ".notion-content-transaction");
    fs.mkdirSync(stateDirectory);
    fs.writeFileSync(path.join(stateDirectory, "journal.json"), JSON.stringify({
      version: 1,
      transactionId: "12345678-1234-4123-8123-123456789abc",
      state: "promoting",
      completedPaths: [],
      entries: [{
        path: "../sentinel.txt",
        backupPath: "../.notion-backup-12345678-1234-4123-8123-123456789abc-sentinel.txt",
        stagedPath: "../.notion-stage-12345678-1234-4123-8123-123456789abc-sentinel.txt",
        hadOriginal: true,
        sha256: "0".repeat(64),
      }],
    }));

    await expect(recoverContentTransaction({ root })).rejects.toThrow(/managed path/i);

    expect(fs.readFileSync(outside, "utf8")).toBe("sentinel");
    fs.rmSync(outside);
  });

  it("Given a stale journal with a path-bearing transaction ID When recovery runs Then it fails closed", async () => {
    const root = fixtureRoot();
    const relativePath = managedPaths[0];
    const transactionId = "../../../../untrusted";
    const targetDirectory = path.posix.dirname(relativePath);
    const suffix = `${transactionId}-${path.posix.basename(relativePath)}`;
    const stateDirectory = path.join(root, ".notion-content-transaction");
    fs.mkdirSync(stateDirectory);
    fs.writeFileSync(path.join(stateDirectory, "journal.json"), JSON.stringify({
      transactionId,
      state: "prepared",
      completedPaths: [],
      entries: [{
        path: relativePath,
        backupPath: `${targetDirectory}/.notion-backup-${suffix}`,
        stagedPath: `${targetDirectory}/.notion-stage-${suffix}`,
        hadOriginal: true,
        sha256: "0".repeat(64),
      }],
    }));

    await expect(recoverContentTransaction({ root })).rejects.toThrow(/journal/i);
  });

  it("Given an active writer When a consumer requests the lock Then acquisition fails", async () => {
    const root = fixtureRoot();
    const lock = acquireContentLock(root);

    expect(() => acquireContentLock(root)).toThrow(/lock/i);

    lock.release();
  });

  it("Given a staging root When sync-pages runs inside a transaction Then live MDX appears only at commit", async () => {
    const root = fixtureRoot();
    const relativePath = "src/content/devlog/fixture/general/aabbcc.mdx";
    const client = { getBlockChildren: async () => [] };
    const rows = [{
      page_id: "aa-bb-cc",
      source_id: "aabbcc",
      title: "Transactional fixture",
      category: "fixture",
      last_edited_time: "2026-08-05T00:00:00.000Z",
    }];

    await promoteContentTransaction({
      root,
      managedPaths: [relativePath],
      async prepare(stageRoot) {
        await syncPageContent(client, "devlog", rows, { root: stageRoot });
        expect(fs.existsSync(path.join(root, relativePath))).toBe(false);
      },
    });

    expect(fs.readFileSync(path.join(root, relativePath), "utf8")).toContain("Transactional fixture");
  });

  it("Given a Notion image When sync-pages stages content Then MDX and downloaded asset are emitted as managed paths", async () => {
    const root = fixtureRoot();
    const contentPath = "src/content/devlog/fixture/general/aabbcc.mdx";
    const assetPath = "public/images/notion/imageblock.png";
    const client = {
      async getBlockChildren() {
        return [{
          id: "image-block",
          type: "image",
          has_children: false,
          image: { external: { url: "https://prod-files-secure.s3.us-west-2.amazonaws.com/image.png" }, caption: [] },
        }];
      },
    };
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(Uint8Array.from([1, 2, 3]), {
      status: 200,
      headers: { "content-type": "image/png" },
    });

    try {
      const result = await syncPageContent(client, "devlog", [{
        page_id: "aa-bb-cc",
        source_id: "aabbcc",
        title: "Transactional image fixture",
        category: "fixture",
        last_edited_time: "2026-08-05T00:00:00.000Z",
      }], { root });

      expect(result.managedPaths).toEqual([assetPath, contentPath]);
      expect(fs.readFileSync(path.join(root, assetPath))).toEqual(Buffer.from([1, 2, 3]));
      expect(fs.readFileSync(path.join(root, contentPath), "utf8")).toContain("/images/notion/imageblock.png");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("Given a prepare result manifest When promotion runs Then its emitted paths define the transaction", async () => {
    const root = fixtureRoot();
    const relativePath = "src/content/devlog/fixture/emitted.mdx";

    const result = await promoteContentTransaction({
      root,
      prepare(stageRoot) {
        const destination = path.join(stageRoot, relativePath);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, "emitted manifest");
        return { managedPaths: [relativePath] };
      },
    });

    expect(result.manifest.map((entry) => entry.path)).toEqual([relativePath]);
    expect(fs.readFileSync(path.join(root, relativePath), "utf8")).toBe("emitted manifest");
  });

  it("Given a killed child after every rename When relaunched Then recovery restores all old bytes without residue", async () => {
    for (let killAfterRename = 1; killAfterRename <= managedPaths.length * 2; killAfterRename += 1) {
      const root = fixtureRoot();
      const before = shaManifest(root);
      const child = spawnSync(process.execPath, [
        path.resolve("tests/notion/content-transaction-child.mjs"), root, String(killAfterRename),
      ]);
      expect(child.status).not.toBe(0);

      await recoverContentTransaction({ root });

      expect(shaManifest(root)).toEqual(before);
      expect(fs.existsSync(path.join(root, ".notion-content-transaction"))).toBe(false);
      expect(fs.existsSync(path.join(root, ".notion-content.lock"))).toBe(false);
    }
  }, 30_000);

  it("Given a killed child after committed When relaunched Then recovery retains the complete new manifest", async () => {
    const root = fixtureRoot();
    const child = spawnSync(process.execPath, [path.resolve("tests/notion/content-transaction-child.mjs"), root, "committed"]);

    expect(child.status).not.toBe(0);
    await expect(recoverContentTransaction({ root })).resolves.toMatchObject({ state: "committed" });
    for (const relativePath of managedPaths) {
      expect(fs.readFileSync(path.join(root, relativePath), "utf8")).toBe(`new:${relativePath}`);
    }
    expect(fs.existsSync(path.join(root, ".notion-content-transaction"))).toBe(false);
    expect(fs.existsSync(path.join(root, ".notion-content.lock"))).toBe(false);
  });
});
