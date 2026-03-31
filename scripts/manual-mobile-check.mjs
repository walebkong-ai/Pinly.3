import fs from "node:fs/promises";
import { chromium } from "@playwright/test";

const baseUrl = process.env.PINLY_MOBILE_CHECK_BASE_URL ?? "http://127.0.0.1:3000";
const e2eSecret = process.env.PINLY_MOBILE_CHECK_SECRET ?? "pinly-e2e-secret";
const screenshotsDir = "/tmp/pinly-mobile-check";
const widths = [320, 375, 390, 430];
const routeChecks = [
  { name: "map", path: "/map" },
  { name: "feed", path: "/feed" },
  { name: "friends", path: "/friends" },
  { name: "messages", path: "/messages" },
  { name: "create", path: "/create" },
  { name: "profile", path: "/profile/me" },
  { name: "notifications", path: "/notifications" }
];

async function waitForSettled(page) {
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.waitForTimeout(700);
}

async function measurePage(page, label) {
  await waitForSettled(page);

  const metrics = await page.evaluate(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const root = document.documentElement;
    const overflowX = Math.max(0, root.scrollWidth - viewportWidth);
    const overflowY = Math.max(0, root.scrollHeight - viewportHeight);

    const offenders = Array.from(document.querySelectorAll("body *"))
      .filter((node) => node instanceof HTMLElement)
      .map((node) => {
        const rect = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);

        return {
          tag: node.tagName.toLowerCase(),
          className: (node.className || "").toString().slice(0, 120),
          left: Number(rect.left.toFixed(1)),
          right: Number(rect.right.toFixed(1)),
          top: Number(rect.top.toFixed(1)),
          width: Number(rect.width.toFixed(1)),
          display: style.display,
          visibility: style.visibility
        };
      })
      .filter((item) => item.visibility !== "hidden" && item.display !== "none" && (item.right > viewportWidth + 1 || item.left < -1))
      .slice(0, 8);

    return {
      viewportWidth,
      viewportHeight,
      overflowX,
      overflowY,
      offenders
    };
  });

  return {
    label,
    url: page.url(),
    ...metrics
  };
}

async function maybeScreenshot(page, width, name) {
  if (width !== 320 && width !== 390) {
    return;
  }

  await page.screenshot({
    path: `${screenshotsDir}/${width}-${name}.png`,
    fullPage: true
  });
}

async function signInAndCaptureStorage(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });
  const page = await context.newPage();

  const resetResponse = await fetch(`${baseUrl}/api/test/reset-demo`, {
    method: "POST",
    headers: {
      "x-pinly-e2e-secret": e2eSecret
    }
  });

  if (!resetResponse.ok) {
    throw new Error(`Reset demo failed with status ${resetResponse.status}`);
  }

  await page.goto(`${baseUrl}/sign-in`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.getByRole("button", { name: /continue as demo user/i }).waitFor({ timeout: 15000 });
  await page.getByRole("button", { name: /continue as demo user/i }).click();
  await page.waitForURL(/\/map(?:\?|$)/, { timeout: 20000 });

  const storageState = await context.storageState();
  await context.close();
  return storageState;
}

async function run() {
  await fs.mkdir(screenshotsDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    const storageState = await signInAndCaptureStorage(browser);

    for (const width of widths) {
      const context = await browser.newContext({
        viewport: { width, height: 844 },
        storageState
      });
      const page = await context.newPage();

      for (const route of routeChecks) {
        await page.goto(`${baseUrl}${route.path}`, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(async () => {
          await page.waitForTimeout(1000);
        });

        results.push({ width, ...(await measurePage(page, route.name)) });
        await maybeScreenshot(page, width, route.name);

        if (route.name === "messages") {
          const messageFriendButton = page.getByRole("button", { name: /message friend/i });
          if ((await messageFriendButton.count()) > 0) {
            await messageFriendButton.click();
            await page.waitForTimeout(300);
            results.push({ width, ...(await measurePage(page, "messages-direct-drawer")) });
            await maybeScreenshot(page, width, "messages-direct-drawer");

            const openFriendButton = page.getByRole("button", { name: /^open$/i }).first();
            if ((await openFriendButton.count()) > 0) {
              await openFriendButton.click();
              await page.waitForURL(/\/messages\/.+/, { timeout: 10000 }).catch(() => {});
              results.push({ width, ...(await measurePage(page, "messages-conversation")) });
              await maybeScreenshot(page, width, "messages-conversation");
            } else {
              await page.keyboard.press("Escape").catch(() => {});
            }
          } else {
            const conversation = page.locator("[role='link']").first();
            if ((await conversation.count()) > 0) {
              await conversation.click();
              await page.waitForURL(/\/messages\/.+/, { timeout: 10000 }).catch(() => {});
              results.push({ width, ...(await measurePage(page, "messages-conversation")) });
              await maybeScreenshot(page, width, "messages-conversation");
            }
          }
        }

        if (route.name === "create") {
          const addFriendsButton = page.getByRole("button", { name: /add friends|edit/i }).first();
          if ((await addFriendsButton.count()) > 0) {
            await addFriendsButton.click();
            await page.waitForTimeout(300);
            results.push({ width, ...(await measurePage(page, "create-tag-drawer")) });
            await maybeScreenshot(page, width, "create-tag-drawer");
            await page.keyboard.press("Escape").catch(() => {});
            await page.waitForTimeout(150);
          }

          const addFoldersButton = page.getByRole("button", { name: /add folders|edit/i }).last();
          if ((await addFoldersButton.count()) > 0) {
            await addFoldersButton.click();
            await page.waitForTimeout(300);
            results.push({ width, ...(await measurePage(page, "create-collection-drawer")) });
            await maybeScreenshot(page, width, "create-collection-drawer");
            await page.keyboard.press("Escape").catch(() => {});
            await page.waitForTimeout(150);
          }
        }

        if (route.name === "map") {
          const filterButton = page.getByRole("button", { name: /open filters/i });
          if ((await filterButton.count()) > 0) {
            await filterButton.click();
            await page.waitForTimeout(250);
            results.push({ width, ...(await measurePage(page, "map-filter-drawer")) });
            await maybeScreenshot(page, width, "map-filter-drawer");
            await page.keyboard.press("Escape").catch(() => {});
            await page.waitForTimeout(150);
          }
        }
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify(results, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
