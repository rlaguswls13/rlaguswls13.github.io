import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "playwright/test";

const origin = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3001";
const evidenceRoot = process.env.TODO17_EVIDENCE_DIR ?? ".omo/evidence/todo-17";
const routes = [
  { name: "home", path: "/" },
  { name: "devlog", path: "/devlog" },
  { name: "journal", path: "/journal" },
  { name: "projects", path: "/projects" },
  { name: "devlog-detail", path: "/devlog/tech_study/apache-tomcat-ssl-operations-guide" },
  { name: "project-detail", path: "/projects/d" },
] as const;
const widths = [375, 768, 1280] as const;
const themes = ["light", "dark"] as const;

for (const route of routes) {
  for (const width of widths) {
    for (const theme of themes) {
      test(`${route.name} has no serious accessibility or responsive defect at ${width}px in ${theme}`, async ({ page }) => {
        // Given
        await mkdir(path.join(evidenceRoot, "screenshots"), { recursive: true });
        await mkdir(path.join(evidenceRoot, "axe"), { recursive: true });
        await page.setViewportSize({ width, height: 900 });
        await page.addInitScript((selectedTheme) => localStorage.setItem("theme", selectedTheme), theme);

        // When
        const response = await page.goto(`${origin}${route.path}`, { waitUntil: "networkidle" });
        await page.locator("body").evaluate((element) => element.getAnimations().map((animation) => animation.finish()));
        const overflow = await page.evaluate(() => ({
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        }));
        const axe = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        const blockingViolations = axe.violations.filter(({ impact }) => impact === "critical" || impact === "serious");
        const artifactName = `${route.name}-${width}-${theme}`;
        await writeFile(
          path.join(evidenceRoot, "axe", `${artifactName}.json`),
          `${JSON.stringify({ route: route.path, width, theme, blockingViolations, violations: axe.violations }, null, 2)}\n`,
          "utf8",
        );
        await page.screenshot({
          path: path.join(evidenceRoot, "screenshots", `${artifactName}.png`),
          fullPage: true,
        });

        // Then
        expect(response?.ok()).toBe(true);
        await expect(page.locator("h1").first()).toBeVisible();
        await expect(page.locator("html")).toHaveClass(new RegExp(`\\btheme-${theme}\\b`));
        expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
        expect(blockingViolations).toEqual([]);
      });
    }
  }
}
