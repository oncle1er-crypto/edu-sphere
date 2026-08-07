import { expect, test } from "@playwright/test";

test("l'application se charge", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.ok()).toBe(true);
  await expect(page.locator("body")).toBeVisible();
  await expect(page).toHaveTitle(/.+/);
});
