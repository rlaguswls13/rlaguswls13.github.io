import { expect, test } from "playwright/test";
import projects from "../../src/data/indexes/projects.json";

const origin = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3001";

test.beforeEach(async ({ page }) => {
  await page.route("**/*.googlesyndication.com/**", (route) => route.abort());
  await page.route("**/*.doubleclick.net/**", (route) => route.abort());
});

test("about project cards navigate to every exported slug", async ({ page }) => {
  // Given: the published projects have distinct storage IDs and slugs.
  for (const project of projects.projects) {
    await page.goto(`${origin}/about`);
    const href = `/projects/${project.slug || project.id}`;
    const card = page.locator(`a.about-work-card[href="${href}"]`);
    // When: the real project card is followed.
    await expect(card).toHaveCount(1);
    await card.click();
    // Then: its exported page renders with the expected title.
    await expect(page).toHaveURL(`${origin}${href}`);
    await expect(page.locator("h1")).toHaveText(project.title);
  }
});

test("legacy article self-links target the published slug", async ({ page }) => {
  // Given: an article whose Notion source retains old /p/ID links.
  const href = "/devlog/education/java-development-environment-and-basic-syntax";
  await page.goto(`${origin}${href}`);
  const link = page.getByRole("link", { name: "Binary", exact: true });
  // When: the original body link is followed.
  await expect(link).toHaveAttribute("href", `${href}#3ab19946ca76808aa755f0385cf56ac7`);
  await link.click();
  // Then: it stays on the article instead of opening a missing /p/ route.
  await expect(page).toHaveURL(`${origin}${href}#3ab19946ca76808aa755f0385cf56ac7`);
  await expect(page.locator("h1")).toHaveText("Java 환경 구축 및 기본 문법");
});
