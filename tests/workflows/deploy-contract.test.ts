import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = (name: string): string => readFileSync(resolve(".github/workflows", name), "utf8");

describe("GitHub Pages deployment contracts", () => {
  it("keeps only content sync and Pages deployment workflows", () => {
    const workflowNames = readdirSync(".github/workflows")
      .filter((name) => name.endsWith(".yml"))
      .sort();

    expect(workflowNames).toEqual(["deploy.yml", "fetch-notion.yml"]);
  });

  it("builds committed static content without fetching Notion", () => {
    const deploy = workflow("deploy.yml");
    const resolvePosition = deploy.indexOf("node scripts/deploy/resolve-pages-path.mjs");
    const buildPosition = deploy.indexOf("npm run build:no-fetch");
    const uploadPosition = deploy.indexOf("uses: actions/upload-pages-artifact@v3");
    const deployPosition = deploy.indexOf("uses: actions/deploy-pages@v4");

    expect(deploy).toContain('branches: ["main"]');
    expect(deploy).toContain("workflow_dispatch:");
    expect(deploy).toContain('workflows: ["Fetch Notion content"]');
    expect(deploy).toContain("types: [completed]");
    expect(deploy).toContain("github.event.workflow_run.conclusion == 'success'");
    expect(deploy).toContain("ref: main");
    expect(deploy).toContain("name: github-pages");
    expect(deploy).toContain("group: pages-production");
    expect(deploy).toContain("cancel-in-progress: true");
    expect(deploy).toContain("node-version-file: .nvmrc");
    expect(deploy).not.toMatch(/fetch-notion|NOTION_TOKEN|NOTION_DATA_SOURCE_ID/);
    expect(deploy).not.toMatch(
      /validate:content|lint:ci|typecheck|test:unit|validate:export|test:e2e|test:lighthouse|audit:react|audit:prod/,
    );
    expect(resolvePosition).toBeGreaterThan(-1);
    expect(buildPosition).toBeGreaterThan(-1);
    expect(buildPosition).toBeGreaterThan(resolvePosition);
    expect(deploy).not.toContain("node scripts/deploy/publish-ads-txt.mjs");
    expect(uploadPosition).toBeGreaterThan(buildPosition);
    expect(deployPosition).toBeGreaterThan(uploadPosition);
  });

  it("passes public build configuration through repository variables", () => {
    const deploy = workflow("deploy.yml");
    const buildStart = deploy.indexOf("- name: Build static export");
    const buildEnd = deploy.indexOf("- uses: actions/configure-pages@v5", buildStart);
    const buildStep = deploy.slice(buildStart, buildEnd);

    expect(buildStep).toContain("ADSENSE_ACCOUNT: \${{ vars.ADSENSE_ACCOUNT }}");
    expect(buildStep).toContain("GA4_PROPERTY_ID: \${{ vars.GA4_PROPERTY_ID }}");
    expect(buildStep).toContain("SEARCH_CONSOLE_VERIFICATION: \${{ vars.SEARCH_CONSOLE_VERIFICATION }}");
    expect(buildStep).toContain("GISCUS_INFO: \${{ vars.GISCUS_INFO }}");
  });

  it("uses only metadata for Search Console verification", () => {
    const deploy = workflow("deploy.yml");

    expect(deploy).toContain("SEARCH_CONSOLE_VERIFICATION: \${{ vars.SEARCH_CONSOLE_VERIFICATION }}");
    expect(deploy).not.toMatch(/SEARCH_CONSOLE_VERIFICATION_(?:FILE|CONTENT)/u);
  });

  it("fetches Notion once at midnight and noon Korea time", () => {
    const fetchNotion = workflow("fetch-notion.yml");

    expect(fetchNotion).toContain('cron: "0 3,15 * * *"');
    expect(fetchNotion.match(/run: npm run fetch-notion/g)).toHaveLength(1);
    expect(fetchNotion).toContain("name: github-pages");
    expect(fetchNotion).toContain("NOTION_TOKEN: \${{ secrets.NOTION_TOKEN }}");
    expect(fetchNotion).toContain("NOTION_DATA_SOURCE_ID_JOURNAL: \${{ secrets.NOTION_DATA_SOURCE_ID_JOURNAL }}");
    expect(fetchNotion).toContain("NOTION_DATA_SOURCE_ID_DEVLOG: \${{ secrets.NOTION_DATA_SOURCE_ID_DEVLOG }}");
    expect(fetchNotion).toContain("NOTION_DATA_SOURCE_ID_PROJECT: \${{ secrets.NOTION_DATA_SOURCE_ID_PROJECT }}");
    expect(fetchNotion).not.toContain("npm run validate:content");
    expect(fetchNotion).toContain("node scripts/notion/commit-sync.mjs");
  });
});
