import { describe, expect, test } from "vitest";
import { resolveMediaViewUrls } from "@/lib/post-media";
import {
  TEST_IMAGE_URL,
  TEST_THUMBNAIL_URL,
  TEST_VIDEO_THUMBNAIL_URL,
  TEST_VIDEO_URL
} from "@/tests/fixtures/media";

function toProxyUrl(url: string) {
  return `/api/media?src=${encodeURIComponent(url)}`;
}

describe("resolveMediaViewUrls", () => {
  test("uses the main image URL and keeps a distinct preview thumbnail", () => {
    expect(
      resolveMediaViewUrls({
        mediaType: "IMAGE",
        mediaUrl: TEST_IMAGE_URL,
        thumbnailUrl: TEST_THUMBNAIL_URL
      })
    ).toEqual({
      primaryUrl: toProxyUrl(TEST_IMAGE_URL),
      primarySource: "media",
      previewUrl: toProxyUrl(TEST_THUMBNAIL_URL),
      posterUrl: ""
    });
  });

  test("falls back to a renderable thumbnail when an image mediaUrl is missing or invalid", () => {
    expect(
      resolveMediaViewUrls({
        mediaType: "IMAGE",
        mediaUrl: "/uploads/legacy-photo.jpg",
        thumbnailUrl: TEST_THUMBNAIL_URL
      })
    ).toEqual({
      primaryUrl: toProxyUrl(TEST_THUMBNAIL_URL),
      primarySource: "thumbnail",
      previewUrl: "",
      posterUrl: ""
    });
  });

  test("does not promote a thumbnail to the main asset for videos", () => {
    expect(
      resolveMediaViewUrls({
        mediaType: "VIDEO",
        mediaUrl: TEST_VIDEO_URL,
        thumbnailUrl: TEST_VIDEO_THUMBNAIL_URL
      })
    ).toEqual({
      primaryUrl: toProxyUrl(TEST_VIDEO_URL),
      primarySource: "media",
      previewUrl: "",
      posterUrl: toProxyUrl(TEST_VIDEO_THUMBNAIL_URL)
    });
  });

  test("returns no primary URL when neither field is renderable", () => {
    expect(
      resolveMediaViewUrls({
        mediaType: "IMAGE",
        mediaUrl: "/uploads/legacy-photo.jpg",
        thumbnailUrl: "https://evil.example.com/preview.jpg"
      })
    ).toEqual({
      primaryUrl: "",
      primarySource: null,
      previewUrl: "",
      posterUrl: ""
    });
  });
});
