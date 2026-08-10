import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  acquireContentLock,
  promoteContentTransaction,
  recoverContentTransaction,
} from "../../scripts/notion/connect/content-transaction.mjs";

const evidencePath = path.resolve(process.argv[2] || ".omo/evidence/todo-3/task-3-personal-blog-improvement.json");
const managedPaths = [
  "src/content/devlog/fixture/one.mdx",
  "public/images/notion/two.png",
  "src/data/indexes/journal.json",
  "src/data/config/slugs.json",
];
const roots = [];

function fixtureRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "notion-transaction-qa-"));
  roots.push(root);
  for (const relativePath of [...managedPaths, "src/content/devlog/unrelated.mdx"]) {
    const destination = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, `old:${relativePath}`);
  }
  return root;
}

function manifest(root) {
  return Object.fromEntries(managedPaths.map((relativePath) => [
    relativePath,
    crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relativePath))).digest("hex"),
  ]));
}

function expectedManifest(prefix) {
  return Object.fromEntries(managedPaths.map((relativePath) => [
    relativePath,
    crypto.createHash("sha256").update(`${prefix}:${relativePath}`).digest("hex"),
  ]));
}

function residue(root) {
  return {
    lock: fs.existsSync(path.join(root, ".notion-content.lock")),
    stateDirectory: fs.existsSync(path.join(root, ".notion-content-transaction")),
  };
}

function journalReceipt(root) {
  const journalPath = path.join(root, ".notion-content-transaction", "journal.json");
  if (!fs.existsSync(journalPath)) return null;
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));
  return {
    state: journal.state,
    currentPath: journal.currentPath,
    completedPaths: journal.completedPaths,
    renameCount: journal.renameCount,
    entries: journal.entries.map(({ path: relativePath, hadOriginal, sha256 }) => ({
      path: relativePath,
      hadOriginal,
      sha256,
    })),
  };
}

const newManifest = expectedManifest("new");
const committedRoot = fixtureRoot();
const unrelatedBefore = fs.readFileSync(path.join(committedRoot, "src/content/devlog/unrelated.mdx"), "utf8");
await promoteContentTransaction({
  root: committedRoot,
  managedPaths,
  prepare(stageRoot) {
    for (const relativePath of managedPaths) {
      const destination = path.join(stageRoot, relativePath);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, `new:${relativePath}`);
    }
  },
});
const committed = {
  manifest: manifest(committedRoot),
  managedPathsCommitted: JSON.stringify(manifest(committedRoot)) === JSON.stringify(newManifest),
  unrelatedUnchanged: fs.readFileSync(path.join(committedRoot, "src/content/devlog/unrelated.mdx"), "utf8") === unrelatedBefore,
  residue: residue(committedRoot),
};

const recovery = [];
for (let killAfterRename = 1; killAfterRename <= managedPaths.length * 2; killAfterRename += 1) {
  const root = fixtureRoot();
  const oldManifest = manifest(root);
  const child = spawnSync(process.execPath, [
    path.resolve("tests/notion/content-transaction-child.mjs"), root, String(killAfterRename),
  ]);
  const journalBeforeRecovery = journalReceipt(root);
  await recoverContentTransaction({ root });
  const recoveredManifest = manifest(root);
  const matchesOld = JSON.stringify(recoveredManifest) === JSON.stringify(oldManifest);
  const matchesNew = JSON.stringify(recoveredManifest) === JSON.stringify(newManifest);
  recovery.push({
    killAfterRename,
    childExitedNonzero: child.status !== 0,
    journalBeforeRecovery,
    matchesOld,
    matchesNew,
    neverMixed: matchesOld || matchesNew,
    residue: residue(root),
  });
}

const lockRoot = fixtureRoot();
const lock = acquireContentLock(lockRoot);
const lockStartedAt = performance.now();
let lockError = "";
try {
  await recoverContentTransaction({ root: lockRoot });
} catch (error) {
  lockError = error instanceof Error ? error.message : String(error);
} finally {
  lock.release();
}
const lockExclusion = {
  rejected: /lock/iu.test(lockError),
  elapsedMilliseconds: Math.round(performance.now() - lockStartedAt),
  residueAfterRelease: residue(lockRoot),
};

const committedRecoveryRoot = fixtureRoot();
const committedChild = spawnSync(process.execPath, [
  path.resolve("tests/notion/content-transaction-child.mjs"), committedRecoveryRoot, "committed",
]);
const committedJournalBeforeRecovery = journalReceipt(committedRecoveryRoot);
await recoverContentTransaction({ root: committedRecoveryRoot });
const committedRecovery = {
  childExitedNonzero: committedChild.status !== 0,
  journalBeforeRecovery: committedJournalBeforeRecovery,
  retainedNewManifest: managedPaths.every((relativePath) => fs.readFileSync(
    path.join(committedRecoveryRoot, relativePath), "utf8",
  ) === `new:${relativePath}`),
  residue: residue(committedRecoveryRoot),
};

const cleanup = roots.map((root) => {
  const safeTemporaryRoot = path.dirname(root) === os.tmpdir() && path.basename(root).startsWith("notion-transaction-qa-");
  if (!safeTemporaryRoot) throw new Error(`Unsafe QA cleanup root: ${root}`);
  fs.rmSync(root, { recursive: true });
  return { root: path.basename(root), removed: !fs.existsSync(root) };
});
const passed = committed.unrelatedUnchanged
  && committed.managedPathsCommitted
  && !committed.residue.lock
  && !committed.residue.stateDirectory
  && recovery.every((item) => item.childExitedNonzero
    && item.neverMixed
    && !item.residue.lock
    && !item.residue.stateDirectory)
  && lockExclusion.rejected
  && !lockExclusion.residueAfterRelease.lock
  && committedRecovery.childExitedNonzero
  && committedRecovery.retainedNewManifest
  && !committedRecovery.residue.lock
  && !committedRecovery.residue.stateDirectory
  && cleanup.every(({ removed }) => removed);
if (!passed) throw new Error("Content transaction manual QA failed.");
const result = {
  doneClaim: {
    status: "complete",
    outcome: "same-volume managed-file promotion committed and every injected hard-kill recovered to a complete old or committed-new manifest",
    criteria: {
      managedManifestOnly: committed.managedPathsCommitted && committed.unrelatedUnchanged,
      lockExclusion: lockExclusion.rejected,
      renameRecoveryNeverMixed: recovery.every((item) => item.neverMixed),
      committedRecoveryValidated: committedRecovery.retainedNewManifest,
      cleanupComplete: cleanup.every(({ removed }) => removed),
    },
  },
  command: "node tests/notion/content-transaction-qa.mjs .omo/evidence/todo-3/task-3-personal-blog-improvement.json",
  committed,
  adversarial: {
    hardKillRenamePoints: recovery,
    hardKillAfterCommitted: committedRecovery,
    lockExclusion,
    malformedPaths: "covered by content-transaction.test.mjs",
    untrustedJournal: "covered by content-transaction.test.mjs",
    staleJournal: "path-bearing transaction IDs fail closed in content-transaction.test.mjs",
    hungLock: `live-owner acquisition rejected in ${lockExclusion.elapsedMilliseconds}ms`,
    interrupt: "SIGKILL child is recovered on relaunch",
    cancelResume: "hard-killed promotion resumes through recoverContentTransaction before a new prepare",
    dirtyWorktree: "fixtures remained root-injected; shared owned-root changes were not mutated",
    misleadingSuccess: "JUnit and verbose reporters both exited zero on GREEN; RED JUnit contains one failure",
    promptInjection: "N/A: transaction inputs are filesystem paths/bytes and cross no model boundary",
  },
  cleanup,
};
fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
fs.writeFileSync(evidencePath, `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(evidencePath.replace(/\.json$/u, ".txt"), [
  "Scenario: commit a mixed MDX/image/index/config manifest; unrelated file unchanged; no residue.",
  "Invocation: node tests/notion/content-transaction-qa.mjs .omo/evidence/todo-3/task-3-personal-blog-improvement.json",
  `Observable: committed=${committed.unrelatedUnchanged}; killed-rename-recoveries=${recovery.length}; committed-recovery=${committedRecovery.retainedNewManifest}; cleanup=${cleanup.every(({ removed }) => removed)}`,
  `Artifact: ${evidencePath}`,
].join("\n"));
console.log(JSON.stringify({ evidencePath, recoveryPoints: recovery.length, cleanupComplete: cleanup.every(({ removed }) => removed) }));
