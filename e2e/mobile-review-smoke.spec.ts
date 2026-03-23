import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { resetDemoAppState } from "./helpers/test-state";

const appOrigin = "http://127.0.0.1:3000";
const mockUploadedMediaUrl =
  "https://vlsjxnserriszfrfxitv.supabase.co/storage/v1/object/public/media/e2e/mock-upload.png";

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
  const createPostForm = page.getByRole("main").getByTestId("create-post-form").first();
  const libraryUploadInput = page.getByRole("main").getByTestId("library-upload-input").first();
  const replaceButton = createPostForm.getByRole("button", { name: /Replace/i }).first();
  const publishButton = createPostForm.getByRole("button", { name: /Publish memory/i }).first();
  const captionField = createPostForm.getByPlaceholder("What made this place feel special?");
  const placeNameField = createPostForm.getByPlaceholder("Place name");
  const cityField = createPostForm.getByPlaceholder("City");
  const countryField = createPostForm.getByPlaceholder("Country");
  const visitedAtField = createPostForm.locator('input[type="date"]').first();
  const selectedLocationCard = createPostForm.getByTestId("create-selected-location").first();
  const createLocationButton = createPostForm.getByRole("button", { name: /Use my current location/i }).first();

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });
  page.on("response", (response) => {
    if (response.status() === 404 && response.url().startsWith(appOrigin)) {
      notFoundUrls.push(response.url());
    }
  });

  await page.route("**/api/uploads", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        mediaUrl: mockUploadedMediaUrl,
        mediaType: "IMAGE",
        thumbnailUrl: null
      })
    });
  });
  await page.route(mockUploadedMediaUrl, async (route) => {
    await route.fulfill({
      status: 200,
      path: uploadPath,
      contentType: "image/png"
    });
  });

  await signInAsDemo(page);
  await expect(offlineBanner).toBeHidden();

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
  await expect(createPostForm).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("create-offline-card")).toBeHidden();
  await expect
    .poll(() => page.evaluate(() => (window as Window & { __pinlyNavMarker?: string }).__pinlyNavMarker))
    .toBe("native-shell-marker");

  const [uploadResponse] = await Promise.all([
    page.waitForResponse(
      (response) => new URL(response.url()).pathname === "/api/uploads" && response.request().method() === "POST",
      { timeout: 15_000 }
    ),
    libraryUploadInput.setInputFiles(uploadPath)
  ]);
  expect(uploadResponse.status()).toBe(200);
  await expect(replaceButton).toBeVisible({ timeout: 15_000 });

  await context.setOffline(true);
  await expect(offlineBanner).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("create-offline-card")).toBeVisible({ timeout: 10_000 });
  await expect(publishButton).toBeDisabled();

  await context.setOffline(false);
  await expect.poll(() => page.evaluate(() => navigator.onLine), { timeout: 15_000 }).toBe(true);
  await page.evaluate(() => {
    window.dispatchEvent(new Event("online"));
  });
  await expect(createPostForm).toBeVisible({ timeout: 15_000 });

  const [secondUploadResponse] = await Promise.all([
    page.waitForResponse(
      (response) => new URL(response.url()).pathname === "/api/uploads" && response.request().method() === "POST",
      { timeout: 15_000 }
    ),
    libraryUploadInput.setInputFiles(uploadPath)
  ]);
  expect(secondUploadResponse.status()).toBe(200);
  await expect(replaceButton).toBeVisible({ timeout: 15_000 });

  await captionField.fill(`Runtime verification memory ${runId}`);
  await placeNameField.fill(`Codex Point ${runId}`);
  await cityField.fill("Toronto");
  await countryField.fill("Canada");
  await visitedAtField.fill("2026-03-22");
  await createLocationButton.click();
  await expect(selectedLocationCard).toBeVisible({ timeout: 15_000 });
  await expect(publishButton).toBeEnabled({ timeout: 15_000 });

  const [publishResponse] = await Promise.all([
    page.waitForResponse(
      (response) => new URL(response.url()).pathname === "/api/posts" && response.request().method() === "POST",
      { timeout: 15_000 }
    ),
    publishButton.click()
  ]);
  expect(publishResponse.status()).toBe(201);
  await expect(page).toHaveURL(/\/map(?:\?|$)/, { timeout: 30_000 });

  expect(notFoundUrls.filter((url) => !url.endsWith("/favicon.ico"))).toEqual([]);
  expect(pageErrors).toEqual([]);
});
