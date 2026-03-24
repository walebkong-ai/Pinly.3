import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { resetDemoAppState } from "./helpers/test-state";

const mockUploadBaseUrl =
  "https://vlsjxnserriszfrfxitv.supabase.co/storage/v1/object/public/media/e2e";

type UploadedAsset = {
  body: Buffer;
  contentType: string;
  fileName: string;
};

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

function parseMultipartUpload(buffer: Buffer | null, contentType: string | null): UploadedAsset {
  if (!buffer) {
    throw new Error("Upload request did not include a file payload.");
  }

  const boundaryMatch = contentType?.match(/boundary=(?:"([^"]+)"|([^;]+))/i);

  if (!boundaryMatch) {
    throw new Error(`Upload request is missing a multipart boundary: ${contentType ?? "null"}`);
  }

  const boundary = boundaryMatch[1] ?? boundaryMatch[2];
  const raw = buffer.toString("latin1");
  const headerEnd = raw.indexOf("\r\n\r\n");

  if (headerEnd === -1) {
    throw new Error("Upload request did not contain multipart headers.");
  }

  const partHeaders = raw.slice(0, headerEnd);
  const payloadStart = headerEnd + 4;
  const payloadEnd = raw.indexOf(`\r\n--${boundary}`, payloadStart);

  if (payloadEnd === -1) {
    throw new Error("Upload request did not contain a terminating multipart boundary.");
  }

  const fileNameMatch = partHeaders.match(/filename="([^"]+)"/i);
  const fileContentTypeMatch = partHeaders.match(/content-type:\s*([^\r\n]+)/i);

  if (!fileNameMatch || !fileContentTypeMatch) {
    throw new Error(`Upload request headers were incomplete: ${partHeaders}`);
  }

  return {
    body: buffer.subarray(payloadStart, payloadEnd),
    contentType: fileContentTypeMatch[1].trim(),
    fileName: fileNameMatch[1]
  };
}

function getJpegDimensions(buffer: Buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw new Error("Uploaded file is not a JPEG image.");
  }

  let offset = 2;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    let marker = buffer[offset + 1];

    while (marker === 0xff) {
      offset += 1;
      marker = buffer[offset + 1];
    }

    offset += 2;

    if (marker === 0xd9 || marker === 0xda) {
      break;
    }

    const segmentLength = buffer.readUInt16BE(offset);

    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      return {
        width: buffer.readUInt16BE(offset + 5),
        height: buffer.readUInt16BE(offset + 3)
      };
    }

    offset += segmentLength;
  }

  throw new Error("Could not determine uploaded JPEG dimensions.");
}

test("mobile create flow crops the selected image before upload and keeps replace/remove stable", async ({ page }) => {
  const runId = `${Date.now()}`;
  const firstUploadPath = path.resolve(process.cwd(), "public/demo-media/posts/circular-quay.jpg");
  const secondUploadPath = path.resolve(process.cwd(), "public/demo-media/posts/paris-cafe.jpg");
  const createPostForm = page.getByRole("main").getByTestId("create-post-form").first();
  const libraryUploadInput = createPostForm.getByTestId("library-upload-input").first();
  const photoEditor = createPostForm.getByTestId("post-photo-editor").first();
  const photoEditorFrame = createPostForm.getByTestId("post-photo-editor-frame").first();
  const photoEditorZoom = createPostForm.getByTestId("post-photo-editor-zoom").first();
  const photoEditorSaveButton = createPostForm.getByTestId("post-photo-editor-save").first();
  const adjustButton = createPostForm.getByRole("button", { name: /Adjust/i }).first();
  const removeButton = createPostForm.getByRole("button", { name: /Remove media/i }).first();
  const replaceButton = createPostForm.getByRole("button", { name: /Replace/i }).first();
  const uploadPreview = createPostForm.getByAltText("Upload preview").first();
  const publishButton = createPostForm.getByRole("button", { name: /Publish memory/i }).first();
  const captionField = createPostForm.getByPlaceholder("What made this place feel special?");
  const placeNameField = createPostForm.getByPlaceholder("Place name");
  const cityField = createPostForm.getByPlaceholder("City");
  const countryField = createPostForm.getByPlaceholder("Country");
  const visitedAtField = createPostForm.locator('input[type="date"]').first();
  const createLocationButton = createPostForm.getByRole("button", { name: /Use my current location/i }).first();
  const selectedLocationCard = createPostForm.getByTestId("create-selected-location").first();

  const uploadedAssets = new Map<string, UploadedAsset>();
  let uploadCount = 0;

  await page.route("**/api/uploads", async (route) => {
    uploadCount += 1;
    const uploadedAsset = parseMultipartUpload(
      route.request().postDataBuffer(),
      await route.request().headerValue("content-type")
    );

    expect(uploadedAsset.fileName).toMatch(/-post\.jpg$/);
    expect(uploadedAsset.contentType).toBe("image/jpeg");
    expect(getJpegDimensions(uploadedAsset.body)).toEqual({ width: 1280, height: 1600 });

    const mediaUrl = `${mockUploadBaseUrl}/crop-${runId}-${uploadCount}.jpg`;
    uploadedAssets.set(mediaUrl, uploadedAsset);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        mediaUrl,
        mediaType: "IMAGE",
        thumbnailUrl: null
      })
    });
  });

  await page.route(`${mockUploadBaseUrl}/**`, async (route) => {
    const uploadedAsset = uploadedAssets.get(route.request().url());

    if (!uploadedAsset) {
      await route.fulfill({ status: 404 });
      return;
    }

    await route.fulfill({
      status: 200,
      body: uploadedAsset.body,
      contentType: uploadedAsset.contentType
    });
  });

  await signInAsDemo(page);
  await page.goto("/create", { waitUntil: "domcontentloaded" });
  await expect(createPostForm).toBeVisible({ timeout: 15_000 });

  await libraryUploadInput.setInputFiles(firstUploadPath);
  await expect(photoEditor).toBeVisible({ timeout: 15_000 });
  await expect(photoEditorSaveButton).toBeVisible();
  await expect(photoEditorZoom).toHaveValue("1");
  await photoEditorZoom.fill("1.45");

  const firstFrameBox = await photoEditorFrame.boundingBox();
  expect(firstFrameBox).not.toBeNull();

  if (firstFrameBox) {
    await page.mouse.move(firstFrameBox.x + firstFrameBox.width / 2, firstFrameBox.y + firstFrameBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(firstFrameBox.x + firstFrameBox.width / 2 - 42, firstFrameBox.y + firstFrameBox.height / 2 + 24, {
      steps: 8
    });
    await page.mouse.up();
  }

  const [firstUploadResponse] = await Promise.all([
    page.waitForResponse(
      (response) => new URL(response.url()).pathname === "/api/uploads" && response.request().method() === "POST",
      { timeout: 15_000 }
    ),
    photoEditorSaveButton.click()
  ]);

  expect(firstUploadResponse.status()).toBe(200);
  await expect(uploadPreview).toBeVisible({ timeout: 15_000 });
  await expect(adjustButton).toBeVisible();
  await expect(replaceButton).toBeVisible();

  await adjustButton.click();
  await expect(photoEditor).toBeVisible({ timeout: 15_000 });
  await photoEditor.getByRole("button", { name: /^Cancel$/i }).click();
  await expect(uploadPreview).toBeVisible({ timeout: 15_000 });

  await replaceButton.click();
  await libraryUploadInput.setInputFiles(secondUploadPath);
  await expect(photoEditor).toBeVisible({ timeout: 15_000 });
  await photoEditor.getByRole("button", { name: /^Cancel$/i }).click();
  await expect(uploadPreview).toBeVisible({ timeout: 15_000 });

  await removeButton.click();
  await expect(createPostForm.getByText("Choose image or video").first()).toBeVisible({ timeout: 15_000 });

  await libraryUploadInput.setInputFiles(secondUploadPath);
  await expect(photoEditor).toBeVisible({ timeout: 15_000 });
  await photoEditorZoom.fill("1.2");

  const [secondUploadResponse] = await Promise.all([
    page.waitForResponse(
      (response) => new URL(response.url()).pathname === "/api/uploads" && response.request().method() === "POST",
      { timeout: 15_000 }
    ),
    photoEditorSaveButton.click()
  ]);

  expect(secondUploadResponse.status()).toBe(200);
  await expect(uploadPreview).toBeVisible({ timeout: 15_000 });
  await expect(adjustButton).toBeVisible();

  const finalMediaUrl = `${mockUploadBaseUrl}/crop-${runId}-2.jpg`;
  await expect(uploadPreview).toHaveAttribute("src", finalMediaUrl);

  await captionField.fill(`Cropped memory ${runId}`);
  await placeNameField.fill(`Crop Point ${runId}`);
  await cityField.fill("Toronto");
  await countryField.fill("Canada");
  await visitedAtField.fill("2026-03-23");
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
  const publishPayload = await publishResponse.json();
  expect(publishPayload.post.mediaUrl).toBe(finalMediaUrl);

  await expect(page).toHaveURL(/\/map(?:\?|$)/, { timeout: 30_000 });

  await page.goto(`/posts/${publishPayload.post.id}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator(`img[src="${finalMediaUrl}"]`).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(`Cropped memory ${runId}`).first()).toBeVisible({ timeout: 15_000 });
});
