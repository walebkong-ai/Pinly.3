import { describe, expect, test } from "vitest";
import {
  normalizeProfileImageUrl,
  normalizeRenderableProfileImageUrl,
  normalizeRenderableStoredMediaUrl,
  normalizeStoredMediaUrl
} from "@/lib/media-url";
import { TEST_IMAGE_URL } from "@/tests/fixtures/media";

describe("media url hardening", () => {
  test("accepts Supabase CDN media URLs", () => {
    expect(normalizeStoredMediaUrl(TEST_IMAGE_URL)).toBe(TEST_IMAGE_URL);
    expect(normalizeStoredMediaUrl("https://bad.example.com/photo.jpg")).toBeNull();
    expect(normalizeStoredMediaUrl("/legacy/example.jpg")).toBeNull();
    expect(
      normalizeStoredMediaUrl("https://user:pass@vlsjxnserriszfrfxitv.supabase.co/storage/v1/object/public/media/a.jpg")
    ).toBeNull();
  });

  test("accepts Supabase CDN avatar URLs only", () => {
    expect(normalizeProfileImageUrl(TEST_IMAGE_URL)).toBe(TEST_IMAGE_URL);
    expect(normalizeProfileImageUrl("https://api.dicebear.com/9.x/thumbs/svg?seed=avery")).toBeNull();
    expect(normalizeProfileImageUrl("https://evil.example.com/avatar.jpg")).toBeNull();
  });

  test("keeps strict write validation while allowing legacy render fallbacks", () => {
    expect(normalizeStoredMediaUrl("/logo.png")).toBeNull();
    expect(normalizeStoredMediaUrl("/demo-media/posts/paris-cafe.jpg")).toBeNull();
    expect(normalizeRenderableStoredMediaUrl("/logo.png")).toBe("/logo.png");
    expect(normalizeRenderableStoredMediaUrl("/uploads/legacy-photo.jpg")).toBe("/logo.png");
    expect(normalizeRenderableStoredMediaUrl("/demo-media/posts/paris-cafe.jpg")).toBe("/demo-media/posts/paris-cafe.jpg");
    expect(normalizeRenderableProfileImageUrl("/pinly-globe-icon.svg")).toBe("/pinly-globe-icon.svg");
    expect(normalizeRenderableProfileImageUrl("/demo-media/avatars/avery.svg")).toBe("/demo-media/avatars/avery.svg");
    expect(normalizeRenderableProfileImageUrl("https://evil.example.com/avatar.jpg")).toBeNull();
  });

  test("accepts safe embedded media data urls for local development uploads", () => {
    const imageDataUrl = "data:image/png;base64,QUJDRA==";
    const videoDataUrl = "data:video/mp4;base64,QUJDRA==";

    expect(normalizeStoredMediaUrl(imageDataUrl)).toBe(imageDataUrl);
    expect(normalizeStoredMediaUrl(videoDataUrl)).toBe(videoDataUrl);
    expect(normalizeProfileImageUrl(imageDataUrl)).toBe(imageDataUrl);
    expect(normalizeProfileImageUrl(videoDataUrl)).toBeNull();
    expect(normalizeStoredMediaUrl("data:text/html;base64,PHNjcmlwdD4=")).toBeNull();
  });
});
