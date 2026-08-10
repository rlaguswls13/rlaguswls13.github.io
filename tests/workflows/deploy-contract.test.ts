import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = (name: string): string => readFileSync(resolve(".github/workflows", name), "utf8");

describe("GitHub Pages deployment contracts", () => {
  it("keeps pull requests read-only and free of Pages deployment", () => {
    const ci = workflow("ci.yml");

    expect(ci).toContain("pull_request:");
    expect(ci).toContain("contents: read");
    expect(ci).not.toContain("uses: actions/deploy-pages@");
    expect(ci).not.toContain("pages: write");
  });

  it("builds and deploys Pages without running long validation jobs", () => {
    const deploy = workflow("deploy.yml");
    const workflowNames = readdirSync(".github/workflows").filter((name) => name.endsWith(".yml")).sort();
    const buildPosition = deploy.indexOf("npm run build:no-fetch");
    const uploadPosition = deploy.indexOf("uses: actions/upload-pages-artifact@v3");
    const deployPosition = deploy.indexOf("uses: actions/deploy-pages@v4");

    expect(workflowNames).toEqual(expect.arrayContaining(["ci.yml", "deploy.yml"]));
    expect(deploy).toContain('branches: ["main"]');
    expect(deploy).toContain("workflow_dispatch:");
    expect(deploy).toContain("group: pages-production");
    expect(deploy).toContain("cancel-in-progress: true");
    expect(deploy).toContain("node-version-file: .nvmrc");
    expect(deploy).not.toMatch(/validate:content|lint:ci|typecheck|test:unit|validate:export|test:e2e|test:lighthouse|audit:react|audit:prod/);
    expect(buildPosition).toBeGreaterThan(-1);
    expect(uploadPosition).toBeGreaterThan(buildPosition);
    expect(deployPosition).toBeGreaterThan(uploadPosition);
  });

  it("passes analytics configuration only to the build", () => {
    const deploy = workflow("deploy.yml");
    const buildStart = deploy.indexOf("- name: Build static export");
    const buildEnd = deploy.indexOf("- name: Publish AdSense ads.txt", buildStart);
    const buildStep = deploy.slice(buildStart, buildEnd);

    expect(buildStep).toContain("ADSENSE_ACCOUNT: \${{ vars.ADSENSE_ACCOUNT }}");
    expect(buildStep).toContain("GA4_PROPERTY_ID: \${{ vars.GA4_PROPERTY_ID }}");
  });
  it("publishes Search Console verification files only when configured", () => {
    const deploy = workflow("deploy.yml");
    const verificationStepStart = deploy.indexOf("Publish Search Console verification file");
    const verificationStep = deploy.slice(verificationStepStart, deploy.indexOf("- uses: actions/configure-pages@v5", verificationStepStart));

    expect(verificationStepStart).toBeGreaterThan(-1);
    expect(verificationStep).toContain("vars.SEARCH_CONSOLE_VERIFICATION_FILE != ''");
    expect(verificationStep).toContain("vars.SEARCH_CONSOLE_VERIFICATION_CONTENT != ''");
    expect(verificationStep).toContain("out/$SEARCH_CONSOLE_VERIFICATION_FILE");
  });
});
