import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { runSessionEndHook } from "../../project/hooks/session-end.mjs";

describe("project session-end hook", () => {
  it("Given a session_end event When memory is recorded Then secrets are redacted and only wiki state changes", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "blog-session-hook-"));
    try {
      const result = await runSessionEndHook({
        root,
        event: {
          type: "session_end",
          session_id: "fixture",
          summary: "Completed pipeline review NOTION_TOKEN=secret-value",
          verification: ["npm run typecheck: PASS"],
          commit: false,
        },
      });

      const memory = fs.readFileSync(path.join(root, "project/wiki/session-memory.md"), "utf8");
      expect(result).toMatchObject({ updated: true, committed: false });
      expect(memory).toContain("NOTION_TOKEN=[REDACTED]");
      expect(memory).not.toContain("secret-value");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("Given a non-session event When the hook runs Then it is a no-op", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "blog-session-hook-"));
    try {
      await expect(runSessionEndHook({ root, event: { type: "session_start", summary: "ignored" } })).resolves.toEqual({
        updated: false,
        committed: false,
        reason: "not-session-end",
      });
      expect(fs.existsSync(path.join(root, "project/wiki/session-memory.md"))).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("Given scoped project changes When session end commits Then unrelated files remain unstaged", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "blog-session-hook-git-"));
    try {
      execFileSync("git", ["init", "-q"], { cwd: root });
      execFileSync("git", ["config", "user.name", "fixture"], { cwd: root });
      execFileSync("git", ["config", "user.email", "fixture@example.test"], { cwd: root });
      fs.mkdirSync(path.join(root, "project/wiki"), { recursive: true });
      fs.writeFileSync(path.join(root, "outside.txt"), "user change", "utf8");
      execFileSync("git", ["add", "outside.txt"], { cwd: root });

      const result = await runSessionEndHook({ root, event: { type: "session_end", session_id: "commit-fixture", summary: "recorded" } });
      const tracked = execFileSync("git", ["show", "--name-only", "--format=", "HEAD"], { cwd: root, encoding: "utf8" });

      expect(result.committed).toBe(true);
      expect(tracked).toContain("project/wiki/session-memory.md");
      expect(tracked).not.toContain("outside.txt");
      expect(fs.readFileSync(path.join(root, "outside.txt"), "utf8")).toBe("user change");
      expect(execFileSync("git", ["diff", "--cached", "--name-only"], { cwd: root, encoding: "utf8" })).toContain("outside.txt");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
