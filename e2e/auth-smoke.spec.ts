import { expect, test } from "@playwright/test";
import { resetDemoAppState } from "./helpers/test-state";

test.beforeEach(async ({ request }) => {
  await resetDemoAppState(request);
});

test("landing page exposes the demo entry point", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /see the world through your friends, not through a feed/i
    })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /explore the demo/i }).first()).toBeVisible();
});

test("protected map redirects signed-out visitors to sign in", async ({ page }) => {
  await page.goto("/map");

  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: /^sign in$/i })).toBeVisible();
});

test("demo sign in reaches the authenticated map shell", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: /continue as demo user/i }).click();

  await expect(page).toHaveURL(/\/map(?:\?|$)/, { timeout: 20_000 });
  await expect(page.getByRole("link", { name: /^map$/i })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("link", { name: /^feed$/i })).toBeVisible({ timeout: 20_000 });
});
