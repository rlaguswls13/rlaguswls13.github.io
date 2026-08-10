import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = (name: string): string => readFileSync(resolve(".github/workflows", name), "utf8");

const actionPosition = (source: string, action: string): number => source.indexOf(`uses: ${action}`);

describe("GitHub Pages deployment contracts", () => {
  it("keeps pull requests read-only and free of Pages deployment", () => {
    // Given: the pull-request workflow.
    const ci = workflow("ci.yml");

    // When: its trigger, permissions, and actions are inspected.
    const deployActionCount = (ci.match(/uses: actions\/deploy-pages@/g) ?? []).length;

    // Then: it can validate a change without writing or deploying.
    expect(ci).toMatch(/^on:\s*\n\s*pull_request:/m);
    expect(ci).toMatch(/^permissions:\s*\n\s*contents: read$/m);
    expect(ci).not.toMatch(/^\s*(?:pages|id-token|attestations):\s*write$/m);
    expect(deployActionCount).toBe(0);
  });

  it("makes deploy.yml the one gated Pages owner", () => {
    // Given: the Pages owner workflow and every workflow source.
    const deploy = workflow("deploy.yml");
    const workflowNames = readdirSync(".github/workflows").filter((name) => name.endsWith(".yml")).sort();
    const workflowSources = workflowNames.map(workflow);

    // When: the deployment actions and ordered normal-release gates are inspected.
    const deployActionCount = workflowSources.reduce(
      (count, source) => count + (source.match(/uses: actions\/deploy-pages@/g) ?? []).length,
      0,
    );
    const requiredGatePositions = [
      "npm run validate:content",
      "npm run lint:ci",
      "npm run typecheck",
      "npm run test:unit -- --run",
      "npm run build:no-fetch",
      "npm run validate:export",
      "npm run test:e2e",
      "npm run test:lighthouse",
      "npm run audit:react",
      "npm run audit:prod",
      "actions/upload-pages-artifact@v3",
      "actions/deploy-pages@v4",
    ].map((value) => (value.startsWith("actions/") ? actionPosition(deploy, value) : deploy.indexOf(value)));

    // Then: exactly one Pages deploy follows all quality gates and source promotion.
    expect(workflowNames).toEqual(expect.arrayContaining(["ci.yml", "deploy.yml"]));
    expect(deployActionCount).toBe(1);
    expect(deploy).toMatch(/^\s*push:\s*\n\s*branches: \["main"\]/m);
    expect(deploy).toMatch(/^\s*workflow_dispatch:/m);
    expect(deploy).toMatch(/group: pages-production/);
    expect(deploy).toMatch(/cancel-in-progress: true/);
    expect(deploy).toMatch(/node-version-file: \.nvmrc/);
    expect(deploy).not.toMatch(/node-version:\s*["']?20/);
    expect(deploy).not.toMatch(/(?:TARGET_REPO|COMMERCIAL_REPO_PAT|git remote add|--force)/);
    expect(deploy.slice(0, deploy.indexOf("jobs:"))).not.toMatch(/(?:id-token|attestations): write/);
    expect(deploy.slice(deploy.indexOf("  deploy:"))).toMatch(/id-token: write\s*\n\s*attestations: write/);
    expect(requiredGatePositions.every((position) => position >= 0)).toBe(true);
    expect(requiredGatePositions.every((position, index) => index === 0 || position > requiredGatePositions[index - 1]!)).toBe(true);
  });

  it("attests a retained rollback bundle and verifies an API-bound rollback before redeploying", () => {
    // Given: the sole deployment workflow.
    const deploy = workflow("deploy.yml");

    // When: the rollback branch and its trust boundary are inspected.
    const rollbackStart = deploy.indexOf("Validate rollback run");
    const rollbackEnd = actionPosition(deploy, "actions/upload-pages-artifact@v3");
    const rollbackBranch = deploy.slice(rollbackStart, rollbackEnd);

    // Then: GitHub attestations, not bundle contents, bind the exact previous main run.
    expect(deploy).toMatch(/rollback_run_id:/);
    expect(deploy).toMatch(/retention-days: 30/);
    expect(deploy).toMatch(/uses: actions\/attest-build-provenance@v3/);
    expect(deploy).toMatch(/subject-checksums: pages-bundle\.sha256/);
    expect(deploy).toMatch(/attestations: write/);
    expect(deploy).toMatch(/id-token: write/);
    expect(rollbackBranch).toMatch(/gh api "repos\/\$\{GITHUB_REPOSITORY\}\/actions\/runs\/\$\{ROLLBACK_RUN_ID\}"/);
    expect(rollbackBranch).toMatch(/\.conclusion == "success"/);
    expect(rollbackBranch).toMatch(/\.head_branch == "main"/);
    expect(rollbackBranch).toMatch(/gh attestation verify/);
    expect(rollbackBranch).toMatch(/--source-ref refs\/heads\/main/);
    expect(rollbackBranch).toMatch(/--source-digest/);
    expect(rollbackBranch).toMatch(/npm run validate:export/);
    expect(rollbackBranch).not.toMatch(/fetch-notion|build:no-fetch/);
  });
});
