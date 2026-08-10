import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { acquireContentLock, ContentLockError } from "./content-lock.mjs";
import { ManagedPathError, normalizeManagedPath } from "./content-manifest.mjs";

const STATE_DIRECTORY = ".notion-content-transaction";
export class ContentTransactionError extends Error {}
export { acquireContentLock, ContentLockError, ManagedPathError };

function transactionPaths(root) {
  const resolvedRoot = path.resolve(root);
  const stateDirectory = path.join(resolvedRoot, STATE_DIRECTORY);
  return {
    root: resolvedRoot, stateDirectory,
    stageRoot: path.join(stateDirectory, "stage"),
    journal: path.join(stateDirectory, "journal.json"),
  };
}

function hashFile(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function fsyncFile(filePath) {
  const descriptor = fs.openSync(filePath, "r+");
  try {
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}

function fsyncDirectory(directoryPath) {
  let descriptor;
  try {
    descriptor = fs.openSync(directoryPath, "r");
    fs.fsyncSync(descriptor);
  } catch (error) {
    const unsupportedOnWindows = process.platform === "win32"
      && error instanceof Error
      && "code" in error
      && (error.code === "EPERM" || error.code === "EINVAL");
    if (!unsupportedOnWindows) throw error;
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

function writeJournal(journalPath, journal) {
  fs.mkdirSync(path.dirname(journalPath), { recursive: true });
  const temporaryPath = `${journalPath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(journal, null, 2)}\n`, { mode: 0o600 });
  fsyncFile(temporaryPath);
  fs.renameSync(temporaryPath, journalPath);
  fsyncFile(journalPath);
  fsyncDirectory(path.dirname(journalPath));
}

function removeState(paths) {
  const expected = path.join(paths.root, STATE_DIRECTORY);
  if (paths.stateDirectory !== expected) throw new ContentTransactionError("Unsafe transaction cleanup path.");
  fs.rmSync(paths.stateDirectory, { recursive: true, force: true });
}

function restoreOriginals(root, entries) {
  for (const entry of [...entries].reverse()) {
    const target = path.join(root, entry.path);
    const backup = path.join(root, entry.backupPath);
    const staged = path.join(root, entry.stagedPath);
    if (fs.existsSync(backup)) {
      fs.rmSync(target, { force: true });
      fs.renameSync(backup, target);
      fsyncDirectory(path.dirname(target));
    } else if (!entry.hadOriginal) {
      fs.rmSync(target, { force: true });
      fsyncDirectory(path.dirname(target));
    }
    fs.rmSync(staged, { force: true });
  }
}

function verifyCommitted(root, entries) {
  return entries.every((entry) => {
    const target = path.join(root, entry.path);
    return fs.existsSync(target) && hashFile(target) === entry.sha256;
  });
}

function parseJournal(paths) {
  let journal;
  try {
    journal = JSON.parse(fs.readFileSync(paths.journal, "utf8"));
  } catch (error) {
    throw new ContentTransactionError(`Malformed content transaction journal: ${error instanceof Error ? error.message : "unknown error"}`);
  }
  if (!journal
    || typeof journal !== "object"
    || journal.version !== 1
    || !Array.isArray(journal.entries)
    || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u.test(journal.transactionId)) {
    throw new ContentTransactionError("Malformed content transaction journal entries.");
  }
  if (!["prepared", "promoting", "committed"].includes(journal.state)
    || !Array.isArray(journal.completedPaths)
    || journal.completedPaths.some((relativePath) => typeof relativePath !== "string")) {
    throw new ContentTransactionError("Malformed content transaction journal state.");
  }
  for (const entry of journal.entries) {
    if (!entry || typeof entry !== "object" || typeof entry.path !== "string") {
      throw new ContentTransactionError("Malformed content transaction journal entry.");
    }
    const relativePath = normalizeManagedPath(entry.path);
    const targetDirectory = path.posix.dirname(relativePath);
    const expectedSuffix = `${journal.transactionId}-${path.posix.basename(relativePath)}`;
    if (entry.backupPath !== `${targetDirectory}/.notion-backup-${expectedSuffix}`
      || entry.stagedPath !== `${targetDirectory}/.notion-stage-${expectedSuffix}`
      || typeof entry.hadOriginal !== "boolean"
      || !/^[a-f0-9]{64}$/u.test(entry.sha256)) {
      throw new ContentTransactionError(`Malformed content transaction journal path: ${relativePath}`);
    }
  }
  return journal;
}

function recoverWhileLocked(paths) {
  if (!fs.existsSync(paths.journal)) {
    if (fs.existsSync(paths.stateDirectory)) removeState(paths);
    return { recovered: false, state: null };
  }
  const journal = parseJournal(paths);
  if (journal.state === "committed" && verifyCommitted(paths.root, journal.entries)) {
    removeState(paths);
    return { recovered: true, state: "committed" };
  }
  restoreOriginals(paths.root, journal.entries);
  removeState(paths);
  return { recovered: true, state: journal.state };
}

export async function recoverContentTransaction({ root }) {
  const paths = transactionPaths(root);
  const lock = acquireContentLock(paths.root);
  try {
    return recoverWhileLocked(paths);
  } finally {
    lock.release();
  }
}

function invokeRenameFault(fault, renameCount) {
  if (fault?.killAfterRename === renameCount) process.kill(process.pid, "SIGKILL");
  if (fault?.throwAfterRename === renameCount) throw new ContentTransactionError("injected rename failure");
}

export async function promoteContentTransaction({ root, managedPaths, prepare, validate, fault }) {
  const paths = transactionPaths(root);
  const lock = acquireContentLock(paths.root);
  try {
    recoverWhileLocked(paths);
    fs.mkdirSync(paths.stageRoot, { recursive: true });
    const prepared = await prepare(paths.stageRoot);
    const emittedPaths = prepared && typeof prepared === "object" && Array.isArray(prepared.managedPaths)
      ? prepared.managedPaths
      : [];
    const manifest = [...new Set([...(managedPaths || []), ...emittedPaths].map(normalizeManagedPath))].sort();
    if (validate) await validate(paths.stageRoot, manifest);

    const transactionId = crypto.randomUUID();
    const entries = manifest.map((relativePath) => {
      const source = path.join(paths.stageRoot, relativePath);
      if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
        throw new ContentTransactionError(`Staged managed file is missing: ${relativePath}`);
      }
      fsyncFile(source);
      const target = path.join(paths.root, relativePath);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const suffix = `${transactionId}-${path.basename(target)}`;
      const stagedPath = path.relative(paths.root, path.join(path.dirname(target), `.notion-stage-${suffix}`)).replaceAll("\\", "/");
      const backupPath = path.relative(paths.root, path.join(path.dirname(target), `.notion-backup-${suffix}`)).replaceAll("\\", "/");
      fs.copyFileSync(source, path.join(paths.root, stagedPath));
      fsyncFile(path.join(paths.root, stagedPath));
      return { path: relativePath, stagedPath, backupPath, hadOriginal: fs.existsSync(target), sha256: hashFile(source) };
    });
    const journal = {
      version: 1,
      transactionId,
      state: "prepared",
      currentPath: null,
      completedPaths: [],
      renameCount: 0,
      entries,
    };
    writeJournal(paths.journal, journal);

    try {
      journal.state = "promoting";
      writeJournal(paths.journal, journal);
      for (const entry of entries) {
        if (!entry.hadOriginal) continue;
        const target = path.join(paths.root, entry.path);
        journal.currentPath = entry.path;
        writeJournal(paths.journal, journal);
        fs.renameSync(target, path.join(paths.root, entry.backupPath));
        fsyncDirectory(path.dirname(target));
        journal.renameCount += 1;
        invokeRenameFault(fault, journal.renameCount);
        writeJournal(paths.journal, journal);
      }
      for (const entry of entries) {
        const target = path.join(paths.root, entry.path);
        journal.currentPath = entry.path;
        writeJournal(paths.journal, journal);
        fs.renameSync(path.join(paths.root, entry.stagedPath), target);
        fsyncDirectory(path.dirname(target));
        journal.renameCount += 1;
        invokeRenameFault(fault, journal.renameCount);
        journal.completedPaths.push(entry.path);
        journal.currentPath = null;
        writeJournal(paths.journal, journal);
      }
      journal.state = "committed";
      writeJournal(paths.journal, journal); if (fault?.killAfterCommit) process.kill(process.pid, "SIGKILL");
      if (!verifyCommitted(paths.root, entries)) throw new ContentTransactionError("Committed content manifest verification failed.");
      removeState(paths);
      return { state: "committed", manifest: entries.map(({ path: relativePath, sha256 }) => ({ path: relativePath, sha256 })) };
    } catch (error) {
      restoreOriginals(paths.root, entries);
      removeState(paths);
      throw error;
    }
  } catch (error) {
    if (fs.existsSync(paths.stateDirectory) && !fs.existsSync(paths.journal)) removeState(paths);
    throw error;
  } finally {
    lock.release();
  }
}
