import { expect, test } from "playwright/test";

test("serves the Korean home page when the pinned preview is running", async ({ page }) => {
  // Given
  const responsePromise = page.waitForResponse((response) => response.url() === "http://127.0.0.1:3001/");

  // When
  await page.goto("http://127.0.0.1:3001/");
  const response = await responsePromise;

  // Then
  expect(response.status()).toBe(200);
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
});
