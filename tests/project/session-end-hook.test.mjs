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

      const memory = fs.readFileSync(path.join(root, "wiki/session-memory.md"), "utf8");
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
      expect(fs.existsSync(path.join(root, "wiki/session-memory.md"))).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("Given no session handoff When session end runs Then the handoff check is explicit", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "blog-session-hook-handoff-"));
    try {
      const result = await runSessionEndHook({
        root,
        event: { type: "session_end", session_id: "handoff-missing", summary: "recorded", commit: false },
      });

      expect(result.handoff).toEqual({
        path: ".agent/session-handoff.md",
        exists: false,
        recorded: false,
        status: "missing",
        requestFinalWiki: false,
        requestPrReview: false,
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("Given a recorded handoff When session end runs Then final Wiki and PR review are requested", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "blog-session-hook-handoff-"));
    try {
      fs.mkdirSync(path.join(root, ".agent"), { recursive: true });
      fs.writeFileSync(path.join(root, ".agent/session-handoff.md"), "---\nstatus: ready\n---\n## Current status\nReady for review.\n", "utf8");

      const result = await runSessionEndHook({
        root,
        event: { type: "session_end", session_id: "handoff-ready", summary: "recorded", commit: false },
      });

      expect(result.handoff).toEqual({
        path: ".agent/session-handoff.md",
        exists: true,
        recorded: true,
        status: "ready",
        requestFinalWiki: true,
        requestPrReview: true,
      });
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("Given scoped project changes When session end commits Then wiki and unrelated files remain unstaged", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "blog-session-hook-git-"));
    try {
      execFileSync("git", ["init", "-q"], { cwd: root });
      execFileSync("git", ["config", "user.name", "fixture"], { cwd: root });
      execFileSync("git", ["config", "user.email", "fixture@example.test"], { cwd: root });
      fs.mkdirSync(path.join(root, "project/skills"), { recursive: true });
      fs.writeFileSync(path.join(root, "project/skills/example.md"), "# Example\n", "utf8");
      fs.writeFileSync(path.join(root, "outside.txt"), "user change", "utf8");
      execFileSync("git", ["add", "outside.txt"], { cwd: root });

      const result = await runSessionEndHook({ root, event: { type: "session_end", session_id: "commit-fixture", summary: "recorded" } });
      const tracked = execFileSync("git", ["show", "--name-only", "--format=", "HEAD"], { cwd: root, encoding: "utf8" });

      expect(result.committed).toBe(true);
      expect(tracked).toContain("project/skills/example.md");
      expect(tracked).not.toContain("wiki/session-memory.md");
      expect(tracked).not.toContain("outside.txt");
      expect(fs.existsSync(path.join(root, "wiki/session-memory.md"))).toBe(true);
      expect(fs.readFileSync(path.join(root, "outside.txt"), "utf8")).toBe("user change");
      expect(execFileSync("git", ["diff", "--cached", "--name-only"], { cwd: root, encoding: "utf8" })).toContain("outside.txt");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
