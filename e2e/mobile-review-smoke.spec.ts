import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

test.use({
  geolocation: { latitude: 43.6532, longitude: -79.3832 },
  permissions: ["geolocation"]
});

async function signInAsDemo(page: Page) {
  await page.goto("/sign-in?demo=1", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/map(?:\?|$)/, { timeout: 30_000 });
}

test("mobile shell navigation stays in-app and create flow shows offline fallback", async ({ page, context }) => {
  const uploadPath = path.resolve(process.cwd(), "public/logo.png");
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const notFoundUrls: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });
  page.on("response", (response) => {
    if (response.status() === 404) {
      notFoundUrls.push(response.url());
    }
  });

  await signInAsDemo(page);

  await page.evaluate(() => {
    (window as Window & { __pinlyNavMarker?: string }).__pinlyNavMarker = "native-shell-marker";
  });

  await page.locator('button[aria-label="Use my current location"]').click();
  await expect(page.getByText(/Centered on your current location\./i).first()).toBeVisible({ timeout: 15_000 });

  await page.locator('a[href="/feed"]:visible').first().click();
  await expect(page).toHaveURL(/\/feed(?:\?|$)/, { timeout: 15_000 });
  await expect
    .poll(() => page.evaluate(() => (window as Window & { __pinlyNavMarker?: string }).__pinlyNavMarker))
    .toBe("native-shell-marker");

  await page.locator('a[href^="/profile/"]:visible').first().click();
  await expect(page).toHaveURL(/\/profile\//, { timeout: 15_000 });
  await expect
    .poll(() => page.evaluate(() => (window as Window & { __pinlyNavMarker?: string }).__pinlyNavMarker))
    .toBe("native-shell-marker");

  await page.locator('a[href="/settings"]:visible').first().click();
  await expect(page).toHaveURL(/\/settings(?:\?|$)/, { timeout: 15_000 });
  await expect
    .poll(() => page.evaluate(() => (window as Window & { __pinlyNavMarker?: string }).__pinlyNavMarker))
    .toBe("native-shell-marker");

  await page.locator('a[href="/create"]:visible').first().click();
  await expect(page).toHaveURL(/\/create(?:\?|$)/, { timeout: 15_000 });
  await expect
    .poll(() => page.evaluate(() => (window as Window & { __pinlyNavMarker?: string }).__pinlyNavMarker))
    .toBe("native-shell-marker");

  const uploadResponsePromise = page.waitForResponse(/\/api\/uploads$/, { timeout: 15_000 });
  await page.getByTestId("library-upload-input").setInputFiles(uploadPath);
  const uploadResponse = await uploadResponsePromise;
  expect(uploadResponse.ok()).toBeTruthy();
  await expect(page.getByRole("button", { name: /Replace/i })).toBeVisible({ timeout: 15_000 });

  await context.setOffline(true);
  await expect(page.getByText(/^No connection$/i).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/You’re offline|You're offline/i)).toBeVisible({ timeout: 10_000 });

  await context.setOffline(false);
  await page.reload({ waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/create(?:\?|$)/, { timeout: 15_000 });

  const secondUploadResponsePromise = page.waitForResponse(/\/api\/uploads$/, { timeout: 15_000 });
  await page.getByTestId("library-upload-input").setInputFiles(uploadPath);
  const secondUploadResponse = await secondUploadResponsePromise;
  expect(secondUploadResponse.ok()).toBeTruthy();
  await expect(page.getByRole("button", { name: /Replace/i })).toBeVisible({ timeout: 15_000 });

  await page.getByPlaceholder("What made this place feel special?").fill("Runtime verification memory");
  await page.getByPlaceholder("Place name").fill("Codex Point");
  await page.getByPlaceholder("City").fill("Toronto");
  await page.getByPlaceholder("Country").fill("Canada");
  await page.locator('input[type="date"]').fill("2026-03-22");
  await page.getByRole("button", { name: /Use my current location/i }).click();
  await expect(page.getByText(/Selected location/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: /Publish memory/i })).toBeEnabled({ timeout: 15_000 });
  await page.getByRole("button", { name: /Publish memory/i }).click();
  await expect(page).toHaveURL(/\/map(?:\?|$)/, { timeout: 30_000 });

  const actionableConsoleErrors = consoleErrors.filter(
    (message) =>
      !/Failed to initialize WebGL|webglcontextcreationerror|Failed to load resource: the server responded with a status of 404/i.test(
        message
      )
  );

  expect(actionableConsoleErrors).toEqual([]);
  expect(notFoundUrls.filter((url) => !url.endsWith("/favicon.ico"))).toEqual([]);
  expect(pageErrors).toEqual([]);
});
