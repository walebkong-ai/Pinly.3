import { expect, test, type Page } from "@playwright/test";
import { resetDemoAppState } from "./helpers/test-state";

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
}

async function closeMobileDrawer(page: Page) {
  const preferredButtons = [/^done$/i, /^cancel$/i, /^close$/i];

  for (const name of preferredButtons) {
    const button = page.getByRole("button", { name }).last();
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      return;
    }
  }

  const overlay = page.locator("[data-vaul-overlay]").last();
  if (await overlay.isVisible().catch(() => false)) {
    await overlay.click({ position: { x: 16, y: 16 } });
    return;
  }

  await page.keyboard.press("Escape");
}

const mobileWidths = [320, 375, 390, 430];

test("mobile messages keep group creation, chat composer, and add-members dialog usable", async ({ page }) => {
  const groupName = `Mobile group ${Date.now()}`;
  const messageText = `Mobile chat message ${Date.now()}`;

  await signInAsDemo(page);
  await page.goto("/messages/create", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: /create group/i })).toBeVisible();
  await page.getByPlaceholder("e.g. Europe Trip 2024").fill(groupName);

  const firstFriendButton = page.locator("button").filter({ hasText: /@/ }).first();
  await expect(firstFriendButton).toBeVisible({ timeout: 15_000 });
  await firstFriendButton.click();

  await page.getByRole("button", { name: /create group/i }).click();
  await expect(page).toHaveURL(/\/messages\/[^/]+$/, { timeout: 30_000 });

  const composer = page.getByPlaceholder(/Type a message|Message /i).first();
  await expect(composer).toBeVisible({ timeout: 15_000 });
  await composer.fill(messageText);
  await page.getByRole("button", { name: /send message/i }).click();
  await expect(page.getByText(messageText)).toBeVisible({ timeout: 15_000 });

  const addButton = page.getByRole("button", { name: /^add$/i }).first();
  await expect(addButton).toBeVisible({ timeout: 15_000 });
  await addButton.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Add to Group")).toBeVisible({ timeout: 15_000 });

  const dialogFriendButtons = dialog.locator("button").filter({ hasText: /@/ });
  const noFriendsMessage = dialog.getByText(/No friends available to add/i);
  await expect
    .poll(
      async () => {
        if ((await dialogFriendButtons.count()) > 0) {
          return "friends";
        }

        if (await noFriendsMessage.isVisible().catch(() => false)) {
          return "empty";
        }

        return "pending";
      },
      { timeout: 15_000 }
    )
    .not
    .toBe("pending");

  if ((await dialogFriendButtons.count()) > 0) {
    await dialogFriendButtons.first().click();
    await expect(dialog.getByRole("button", { name: /Add 1 Member/i })).toBeEnabled();
  } else {
    await expect(noFriendsMessage).toBeVisible();
  }

  await dialog.getByRole("button", { name: /^cancel$/i }).click();
  await expect(dialog).toBeHidden({ timeout: 15_000 });
});

test("mobile map keeps the canvas dominant within the viewport", async ({ page }) => {
  await signInAsDemo(page);
  await page.locator(".pinly-map-stage").waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForTimeout(400);

  const metrics = await page.evaluate(() => {
    const stage = document.querySelector(".pinly-map-stage");
    const nav = document.querySelector(".pinly-mobile-nav");

    if (!(stage instanceof HTMLElement) || !(nav instanceof HTMLElement)) {
      return null;
    }

    const stageRect = stage.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();

    return {
      stageHeight: stageRect.height,
      viewportHeight: window.innerHeight,
      gapAboveNav: navRect.top - stageRect.bottom
    };
  });

  expect(metrics).not.toBeNull();
  expect(metrics!.stageHeight).toBeGreaterThan(metrics!.viewportHeight * 0.6);
  expect(metrics!.gapAboveNav).toBeLessThan(32);
});

for (const width of mobileWidths) {
  test(`mobile map filter sidebar stays overlay-only without layout shift at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await signInAsDemo(page);
    await page.locator(".pinly-map-stage").waitFor({ state: "visible", timeout: 20_000 });

    const filterButton = page.getByRole("button", { name: /open filters/i });
    const searchInput = page.getByPlaceholder("Search places, cities, countries, people, captions");

    await expect(filterButton).toBeVisible({ timeout: 15_000 });
    await expect(searchInput).toBeVisible({ timeout: 15_000 });

    const stageBefore = await page.locator(".pinly-map-stage").boundingBox();
    expect(stageBefore).not.toBeNull();

    await filterButton.click();

    const sidebar = page.getByRole("dialog", { name: /map filters/i });
    await expect(sidebar).toBeVisible({ timeout: 15_000 });
    await expect(filterButton).toBeHidden();
    await expect(searchInput).toBeHidden();
    await page.waitForFunction(() => {
      const sidebarElement = document.querySelector("[data-testid='map-filter-sidebar']");

      if (!(sidebarElement instanceof HTMLElement)) {
        return false;
      }

      const sidebarRect = sidebarElement.getBoundingClientRect();
      return Math.abs(sidebarRect.right - window.innerWidth) < 2;
    });

    const overlayMetrics = await page.evaluate(() => {
      const stage = document.querySelector(".pinly-map-stage");
      const sidebarElement = document.querySelector("[data-testid='map-filter-sidebar']");
      const overlayRoot = document.querySelector("[data-pinly-overlay-root='true']");
      const appShell = document.querySelector("[data-pinly-app-shell='true']") as (HTMLElement & { inert?: boolean }) | null;

      if (!(stage instanceof HTMLElement) || !(sidebarElement instanceof HTMLElement)) {
        return null;
      }

      const stageRect = stage.getBoundingClientRect();
      const sidebarRect = sidebarElement.getBoundingClientRect();

      return {
        stageLeft: stageRect.left,
        stageWidth: stageRect.width,
        sidebarWidth: sidebarRect.width,
        sidebarRight: sidebarRect.right,
        viewportWidth: window.innerWidth,
        overlayRootPresent: Boolean(overlayRoot?.contains(sidebarElement)),
        shellInert: Boolean(appShell?.inert),
        sidebarDataset: document.documentElement.dataset.pinlySidebarOpen ?? null
      };
    });

    expect(overlayMetrics).not.toBeNull();
    expect(overlayMetrics!.overlayRootPresent).toBe(true);
    expect(overlayMetrics!.shellInert).toBe(true);
    expect(overlayMetrics!.sidebarDataset).toBe("true");
    expect(overlayMetrics!.stageLeft).toBeCloseTo(stageBefore!.x, 1);
    expect(overlayMetrics!.stageWidth).toBeCloseTo(stageBefore!.width, 1);
    expect(Math.abs(overlayMetrics!.sidebarRight - overlayMetrics!.viewportWidth)).toBeLessThanOrEqual(2);
    expect(overlayMetrics!.sidebarWidth).toBeGreaterThanOrEqual(240);
    expect(overlayMetrics!.sidebarWidth).toBeLessThanOrEqual(Math.min(300, overlayMetrics!.viewportWidth * 0.8) + 1);

    await page.getByTestId("map-filter-backdrop").click({ position: { x: 20, y: 20 } });
    await expect(sidebar).toBeHidden({ timeout: 15_000 });
    await expect(filterButton).toBeVisible({ timeout: 15_000 });
    await expect(searchInput).toBeVisible({ timeout: 15_000 });

    const stageAfter = await page.locator(".pinly-map-stage").boundingBox();
    expect(stageAfter).not.toBeNull();
    expect(stageAfter!.x).toBeCloseTo(stageBefore!.x, 1);
    expect(stageAfter!.width).toBeCloseTo(stageBefore!.width, 1);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const appShell = document.querySelector("[data-pinly-app-shell='true']") as (HTMLElement & { inert?: boolean }) | null;
          return {
            shellInert: Boolean(appShell?.inert),
            sidebarDataset: document.documentElement.dataset.pinlySidebarOpen ?? null
          };
        })
      )
      .toEqual({ shellInert: false, sidebarDataset: null });
  });
}

test("mobile create and post-detail drawers keep search fields and actions visible", async ({ page }) => {
  await signInAsDemo(page);

  await page.goto("/create", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("create-post-form")).toBeVisible({ timeout: 15_000 });

  await page.getByRole("button", { name: /add friends/i }).click();
  await expect(page.getByRole("heading", { name: "Tag friends" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByPlaceholder("Search friends...")).toBeVisible();
  const doneButton = page.getByRole("button", { name: /^done$/i }).last();
  await expect(doneButton).toBeVisible({ timeout: 15_000 });
  await doneButton.click();
  await expect(page.getByPlaceholder("Search friends...")).toBeHidden({ timeout: 15_000 });

  await page.getByRole("button", { name: /add folders/i }).click();
  await expect(page.getByPlaceholder("Search collections...")).toBeVisible({ timeout: 15_000 });
  await closeMobileDrawer(page);
  await expect(page.getByPlaceholder("Search collections...")).toBeHidden({ timeout: 15_000 });

  await page.goto("/profile/me", { waitUntil: "domcontentloaded" });
  const openLink = page.getByRole("link", { name: /^open$/i }).first();
  await expect(openLink).toBeVisible({ timeout: 15_000 });
  await openLink.click();
  await expect(page).toHaveURL(/\/posts\/[^/]+$/, { timeout: 30_000 });

  await page.getByRole("button", { name: /^share$/i }).click();
  await expect(page.getByRole("heading", { name: "Share memory" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByPlaceholder("Search people or groups...")).toBeVisible();
  await closeMobileDrawer(page);
  await expect(page.getByPlaceholder("Search people or groups...")).toBeHidden({ timeout: 15_000 });

  await page.getByRole("button", { name: /^directions$/i }).click();
  await expect(page.getByRole("heading", { name: "Open directions" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Google Maps|Apple Maps/).first()).toBeVisible();
});
