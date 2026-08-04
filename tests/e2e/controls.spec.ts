import { expect, test, type Locator, type Page } from "playwright/test";

const origin = "http://127.0.0.1:3000";

async function expectVisibleFocus(locator: Locator) {
  await locator.focus();
  const focus = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const topElement = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
      unobscured: topElement === element
        || element.contains(topElement)
        || topElement?.contains(element) === true,
    };
  });
  expect(
    focus.outlineStyle !== "none" && focus.outlineWidth !== "0px"
      || focus.boxShadow !== "none",
  ).toBe(true);
  expect(focus.unobscured).toBe(true);
}

async function openSearch(page: Page) {
  const search = page.getByRole("searchbox");
  if (await search.count()) return search;
  const openButton = page.getByRole("button", { name: "검색", exact: true });
  await expect(openButton).toBeVisible();
  await openButton.click();
  await expect(search).toBeVisible();
  return search;
}

test.describe("PIN: current list behavior", () => {
  test("preserves the shipped project tab order, card count, and styling", async ({ page }) => {
    // Given
    await page.goto(`${origin}/projects`);

    // When
    const tabs = page.locator(".category-tab");

    // Then
    await expect(tabs).toHaveText(["전체", "참여 작업", "토이프로젝트"]);
    await expect(page.locator(".projects-grid > a")).toHaveCount(6);
    await expect(tabs.first()).toHaveCSS("font-size", "16.8px");
    await expect(tabs.first()).toHaveCSS("padding", "10px 24px");
  });

  test("keeps canonical query parsing, filtering, and page clamping", async ({ page }) => {
    // Given
    await page.goto(`${origin}/devlog?page=-3&q=spring`);

    // When
    await expect(page.locator(".devlog-grid")).toBeVisible();

    // Then
    await expect(page).toHaveURL(`${origin}/devlog?q=spring`);
    await expect(page.locator(".devlog-card-link")).not.toHaveCount(0);
    await expect(page.getByPlaceholder("검색어 입력...")).toHaveValue("spring");
  });
});

test.describe("semantic controls", () => {
  test("uses native pressed buttons for category filters", async ({ page }) => {
    // Given
    await page.goto(`${origin}/projects`);

    // When
    const activeTab = page.getByRole("button", { name: "전체", exact: true });

    // Then
    await expect(activeTab).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "참여 작업" })).toHaveAttribute("aria-pressed", "false");
    await activeTab.press("Space");
  });

  test("separates education preview and article controls", async ({ page }) => {
    // Given
    await page.goto(`${origin}/journal?category=education`);

    // When
    const preview = page.getByRole("button", { name: /미리보기/ }).first();

    // Then
    await expect(preview).toBeVisible();
    await expect(preview.locator("a, button")).toHaveCount(0);
    await expect(page.locator("a button, button a")).toHaveCount(0);
  });

  test("renders named SVG theme and code controls without emoji", async ({ page }) => {
    // Given
    await page.goto(`${origin}/`);

    // When
    const theme = page.locator(".theme-toggle");

    // Then
    await expect(theme.locator("svg")).toHaveCount(1);
    await expect(theme).not.toContainText(/[\p{Extended_Pictographic}]/u);
    await expect(page.locator("body")).not.toContainText("Carrer");

    await page.goto(`${origin}/devlog/tech_study/apache-tomcat-ssl-operations-guide`);
    const codeControl = page.getByRole("button", { name: /server\.xml/ }).first();
    await expect(codeControl.locator("svg")).toHaveCount(2);
    await expect(codeControl).not.toContainText(/[\p{Extended_Pictographic}]/u);
  });

  test("gives every approved control a visible, unobscured focus indicator", async ({ page }) => {
    // Given
    await page.goto(`${origin}/projects`);
    const controls = [
      page.getByRole("link", { name: /TECH LOG KHJ/ }),
      page.getByRole("link", { name: "Career" }),
      page.getByRole("button", { name: "전체", exact: true }).first(),
      page.getByRole("button", { name: "검색", exact: true }),
      page.locator(".theme-toggle"),
    ];

    // When / Then
    for (const control of controls) await expectVisibleFocus(control);
  });
});

test.describe("accessible search and pagination", () => {
  test("applies search on Enter, canonicalizes q, filters, and retains focus", async ({ page }) => {
    // Given
    await page.goto(`${origin}/devlog`);
    const search = await openSearch(page);
    await search.fill("spring");

    // When
    await search.press("Enter");

    // Then
    await expect(page).toHaveURL(`${origin}/devlog?q=spring`);
    await expect(search).toBeFocused();
    await expect(page.locator(".devlog-card-link")).not.toHaveCount(0);
  });

  test("marks active pages, disables endpoints, and retains pagination focus", async ({ page }) => {
    // Given
    await page.goto(`${origin}/projects`);
    const pageTwo = page.locator(".pagination-container .pagination-btn").filter({ hasText: /^2$/ });

    // When
    await pageTwo.click();

    // Then
    await expect(page).toHaveURL(`${origin}/projects?page=2`);
    await expect(pageTwo).toHaveAttribute("aria-current", "page");
    await expect(pageTwo).toBeFocused();
    await expect(page.getByRole("button", { name: "Previous page" })).toBeEnabled();
  });

  test("clamps overflow and post-filter page shrink without a URL loop", async ({ page }) => {
    // Given
    await page.goto(`${origin}/projects?page=999`);
    await expect(page).not.toHaveURL(/page=999/);
    const search = await openSearch(page);

    // When
    await search.fill("파일 업로드");
    await search.press("Enter");

    // Then
    await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("파일 업로드");
    expect(new URL(page.url()).searchParams.has("page")).toBe(false);
    await expect(search).toBeFocused();
    await expect(page.getByRole("button", { name: "Previous page" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  test("keeps no-result search on a safe announced first page", async ({ page }) => {
    // Given
    await page.goto(`${origin}/journal`);
    const search = await openSearch(page);

    // When
    await search.fill("__no_matching_entry__");
    await search.press("Enter");

    // Then
    await expect(page.locator(".devlog-empty-state")).toBeVisible();
    await expect(page.getByRole("button", { name: "Page 1, current page" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("button", { name: "Previous page" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  for (const width of [375, 768, 1280]) {
    test(`supports the keyboard-only control flow at ${width}px`, async ({ page }) => {
      // Given
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${origin}/projects`);
      const activeTab = page.getByRole("button", { name: "전체", exact: true }).first();
      await activeTab.focus();
      await activeTab.press("Space");
      const openButton = page.getByRole("button", { name: "검색", exact: true });
      await openButton.focus();
      await openButton.press("Enter");
      const search = page.getByRole("searchbox");
      await search.pressSequentially("파일 업로드");

      // When
      await search.press("Enter");

      // Then
      await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("파일 업로드");
      await expect(search).toBeFocused();
      const clear = page.getByRole("button", { name: "검색 지우기" });
      await clear.focus();
      await clear.press("Enter");
      await expect(search).toBeFocused();
      await expect.poll(() => new URL(page.url()).searchParams.has("q")).toBe(false);

      const pageTwo = page.locator(".pagination-container .pagination-btn").filter({ hasText: /^2$/ });
      await pageTwo.focus();
      await pageTwo.press("Enter");
      await expect.poll(() => new URL(page.url()).searchParams.get("page")).toBe("2");
      await expect(pageTwo).toBeFocused();
      await expect(page.getByRole("button", { name: "Next page" })).toBeDisabled();

      const previous = page.getByRole("button", { name: "Previous page" });
      await previous.focus();
      await previous.press("Space");
      await expect.poll(() => new URL(page.url()).searchParams.has("page")).toBe(false);
      await expect(previous).toBeFocused();
      await expect(previous).toBeDisabled();

      await search.focus();
      await search.press("Shift+Tab");
      await expect(page.getByRole("button", { name: "전체 보기" })).toBeFocused();
      await expectVisibleFocus(page.getByRole("button", { name: "전체 보기" }));
    });
  }
});
