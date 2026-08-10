import fs from "node:fs";
import path from "node:path";

const LOCK_FILE = ".notion-content.lock";

export class ContentLockError extends Error {}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ESRCH") return false;
    return true;
  }
}

export function acquireContentLock(root) {
  const resolvedRoot = path.resolve(root);
  const lockPath = path.join(resolvedRoot, LOCK_FILE);
  fs.mkdirSync(resolvedRoot, { recursive: true });
  let descriptor;
  try {
    descriptor = fs.openSync(lockPath, "wx", 0o600);
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "EEXIST") throw error;
    let stale = true;
    try {
      const owner = JSON.parse(fs.readFileSync(lockPath, "utf8"));
      stale = !Number.isInteger(owner.pid) || !isProcessAlive(owner.pid);
    } catch (readError) {
      if (!(readError instanceof Error)) throw readError;
    }
    if (!stale) throw new ContentLockError(`Notion content lock is held: ${lockPath}`);
    fs.unlinkSync(lockPath);
    descriptor = fs.openSync(lockPath, "wx", 0o600);
  }
  fs.writeFileSync(descriptor, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
  fs.fsyncSync(descriptor);
  let released = false;
  return {
    release() {
      if (released) return;
      released = true;
      fs.closeSync(descriptor);
      fs.unlinkSync(lockPath);
    },
  };
}
