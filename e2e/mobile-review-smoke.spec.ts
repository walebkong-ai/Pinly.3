import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { resetDemoAppState } from "./helpers/test-state";

const appOrigin = "http://127.0.0.1:3000";

test.use({
  geolocation: { latitude: 43.6532, longitude: -79.3832 },
  permissions: ["geolocation"]
});

test.beforeEach(async ({ request }) => {
  await resetDemoAppState(request);
});

async function signInAsDemo(page: Page) {
  await page.goto("/sign-in?demo=1", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/map(?:\?|$)/, { timeout: 30_000 });
  await expect(page.getByRole("link", { name: /^map$/i }).first()).toBeVisible({ timeout: 15_000 });
}

test("mobile shell navigation stays in-app and create flow shows offline fallback", async ({ page, context }) => {
  const uploadPath = path.resolve(process.cwd(), "public/logo.png");
  const pageErrors: string[] = [];
  const notFoundUrls: string[] = [];
  const runId = `${Date.now()}`;
  const offlineBanner = page.getByTestId("offline-banner").first();

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });
  page.on("response", (response) => {
    if (response.status() === 404 && response.url().startsWith(appOrigin)) {
      notFoundUrls.push(response.url());
    }
  });

  await signInAsDemo(page);

  await page.evaluate(() => {
    (window as Window & { __pinlyNavMarker?: string }).__pinlyNavMarker = "native-shell-marker";
  });

  await page.getByRole("button", { name: /Use my current location/i }).click();
  await expect(page.getByText(/Centered on your current location\./i).first()).toBeVisible({ timeout: 15_000 });

  await page.getByRole("link", { name: /^feed$/i }).first().click();
  await expect(page).toHaveURL(/\/feed(?:\?|$)/, { timeout: 15_000 });
  await expect
    .poll(() => page.evaluate(() => (window as Window & { __pinlyNavMarker?: string }).__pinlyNavMarker))
    .toBe("native-shell-marker");

  await page.getByRole("link", { name: /^profile$/i }).first().click();
  await expect(page).toHaveURL(/\/profile\//, { timeout: 15_000 });
  await expect
    .poll(() => page.evaluate(() => (window as Window & { __pinlyNavMarker?: string }).__pinlyNavMarker))
    .toBe("native-shell-marker");

  const settingsLink = page.getByRole("link", { name: /^settings$/i }).last();
  await expect(settingsLink).toBeVisible({ timeout: 15_000 });
  await settingsLink.click();
  await expect(page).toHaveURL(/\/settings(?:\?|$)/, { timeout: 15_000 });
  await expect
    .poll(() => page.evaluate(() => (window as Window & { __pinlyNavMarker?: string }).__pinlyNavMarker))
    .toBe("native-shell-marker");

  await page.getByRole("link", { name: /^create$/i }).first().click();
  await expect(page).toHaveURL(/\/create(?:\?|$)/, { timeout: 15_000 });
  await expect(page.getByTestId("create-post-form")).toBeVisible({ timeout: 15_000 });
  await expect
    .poll(() => page.evaluate(() => (window as Window & { __pinlyNavMarker?: string }).__pinlyNavMarker))
    .toBe("native-shell-marker");

  const [uploadResponse] = await Promise.all([
    page.waitForResponse(
      (response) => new URL(response.url()).pathname === "/api/uploads" && response.request().method() === "POST",
      { timeout: 15_000 }
    ),
    page.getByTestId("library-upload-input").setInputFiles(uploadPath)
  ]);
  expect(uploadResponse.status()).toBe(200);
  await expect(page.getByRole("button", { name: /Replace/i })).toBeVisible({ timeout: 15_000 });

  await context.setOffline(true);
  await expect(offlineBanner).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("create-offline-card")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("button", { name: /Publish memory/i })).toBeDisabled();

  await context.setOffline(false);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/create(?:\?|$)/, { timeout: 15_000 });
  await expect(page.getByTestId("create-post-form")).toBeVisible({ timeout: 15_000 });

  const [secondUploadResponse] = await Promise.all([
    page.waitForResponse(
      (response) => new URL(response.url()).pathname === "/api/uploads" && response.request().method() === "POST",
      { timeout: 15_000 }
    ),
    page.getByTestId("library-upload-input").setInputFiles(uploadPath)
  ]);
  expect(secondUploadResponse.status()).toBe(200);
  await expect(page.getByRole("button", { name: /Replace/i })).toBeVisible({ timeout: 15_000 });

  await page.getByPlaceholder("What made this place feel special?").fill(`Runtime verification memory ${runId}`);
  await page.getByPlaceholder("Place name").fill(`Codex Point ${runId}`);
  await page.getByPlaceholder("City").fill("Toronto");
  await page.getByPlaceholder("Country").fill("Canada");
  await page.locator('input[type="date"]').fill("2026-03-22");
  await page.getByRole("button", { name: /Use my current location/i }).click();
  await expect(page.getByTestId("create-selected-location")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: /Publish memory/i })).toBeEnabled({ timeout: 15_000 });

  const [publishResponse] = await Promise.all([
    page.waitForResponse(
      (response) => new URL(response.url()).pathname === "/api/posts" && response.request().method() === "POST",
      { timeout: 15_000 }
    ),
    page.getByRole("button", { name: /Publish memory/i }).click()
  ]);
  expect(publishResponse.status()).toBe(201);
  await expect(page).toHaveURL(/\/map(?:\?|$)/, { timeout: 30_000 });

  expect(notFoundUrls.filter((url) => !url.endsWith("/favicon.ico"))).toEqual([]);
  expect(pageErrors).toEqual([]);
});
