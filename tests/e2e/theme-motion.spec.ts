import { expect, test } from "playwright/test";

const origin = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3001";
const viewports = [375, 768, 1280] as const;

test.describe("theme and motion preferences", () => {
  for (const width of viewports) test(`applies fresh light and stored dark preferences before client hydration at ${width}px`, async ({ page }) => {
    // Given: a returning visitor with a stored dark preference and no client chunks.
    await page.route("**/_next/static/**", (route) => route.request().resourceType() === "script" ? route.fulfill({ body: "", contentType: "text/javascript" }) : route.continue());
    await page.setViewportSize({ width, height: 900 });

    // When: the server document reaches its first usable DOM state.
    await page.goto(`${origin}/`, { waitUntil: "domcontentloaded" });
    const lightOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    await expect(page.locator("html")).toHaveClass(/\btheme-light\b/);
    await page.addInitScript(() => localStorage.setItem("theme", "dark"));
    await page.goto(`${origin}/?theme=dark`, { waitUntil: "domcontentloaded" });
    const darkOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    if (width === 1280) await page.screenshot({ path: ".omo/evidence/todo-15/final/theme-dark-first-paint-1280.png", fullPage: false });

    // Then: the first paint is already dark instead of waiting for hydration.
    await expect(page.locator("html")).toHaveClass(/\btheme-dark\b/);
    expect(lightOverflow).toBe(false);
    expect(darkOverflow).toBe(false);
  });

  test("removes nonessential theme, card, dialog, carousel, and loading motion", async ({ page }) => {
    // Given: a visitor who requests reduced motion.
    await page.emulateMedia({ reducedMotion: "reduce" });

    // When: each representative surface is rendered.
    await page.goto(`${origin}/projects`);
    const cardMotion = await page.locator(".project-card").first().evaluate((element) => getComputedStyle(element).transitionDuration);
    const themeMotion = await page.locator("body").evaluate((element) => getComputedStyle(element).transitionDuration);

    await page.goto(`${origin}/`);
    await page.locator(".tech-tag-more-button").click();
    const dialogMotion = await page.locator("[data-dialog-overlay]").evaluate((element) => getComputedStyle(element).animationName);

    const carouselMotion = await page.evaluate(() => {
      const carousel = document.createElement("div");
      carousel.className = "about-highlights-carousel-track";
      document.body.append(carousel);
      const transitionDuration = getComputedStyle(carousel).transitionDuration;
      carousel.remove();
      return transitionDuration;
    });

    const loadingMotion = await page.evaluate(() => {
      const placeholder = document.createElement("div");
      placeholder.className = "loading-placeholder";
      document.body.append(placeholder);
      const animationName = getComputedStyle(placeholder, "::after").animationName;
      placeholder.remove();
      return animationName;
    });

    // Then: reduced motion suppresses decorative timing while preserving the surfaces.
    expect(themeMotion).toBe("0s");
    expect(cardMotion).toBe("0s");
    expect(dialogMotion).toBe("none");
    expect(carouselMotion).toBe("0s");
    expect(loadingMotion).toBe("none");
  });
});
