import { describe, expect, test } from "vitest";
import { classifyLegacyMediaUrl, normalizeLegacyRenderableMediaUrl } from "@/lib/legacy-media";

describe("legacy media classification", () => {
  test("classifies recoverable vercel blob images", () => {
    const source = classifyLegacyMediaUrl(
      "https://2artlyjzrtu4ozob.public.blob.vercel-storage.com/uploads/2639e831-c8af-4883-8532-af9ac76514ba.jpeg",
      "post"
    );

    expect(source).toMatchObject({
      category: "vercel_blob_image",
      extension: "jpeg",
      renderUrl:
        "https://2artlyjzrtu4ozob.public.blob.vercel-storage.com/uploads/2639e831-c8af-4883-8532-af9ac76514ba.jpeg",
      suggestedContentType: "image/jpeg"
    });
  });

  test("marks HEIC blob posts as migratable but not directly renderable", () => {
    const source = classifyLegacyMediaUrl(
      "https://2artlyjzrtu4ozob.public.blob.vercel-storage.com/uploads/902a57a1-3166-4618-beba-5fed49096143.heic",
      "post"
    );

    expect(source).toMatchObject({
      category: "vercel_blob_heic",
      extension: "heic",
      renderUrl: null,
      suggestedContentType: "image/heic"
    });
  });

  test("classifies picsum posts and mdn videos as legacy-compatible media", () => {
    expect(
      classifyLegacyMediaUrl("https://picsum.photos/seed/pinly-1/1200/900", "post")
    ).toMatchObject({
      category: "picsum_image",
      extension: "jpg",
      renderUrl: "https://picsum.photos/seed/pinly-1/1200/900"
    });

    expect(
      classifyLegacyMediaUrl("https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", "post")
    ).toMatchObject({
      category: "mdn_video",
      extension: "mp4",
      renderUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
    });
  });

  test("normalizes dicebear avatars to the png render/upload endpoint", () => {
    const source = classifyLegacyMediaUrl("https://api.dicebear.com/9.x/thumbs/svg?seed=avery", "avatar");

    expect(source).toMatchObject({
      category: "dicebear_avatar",
      extension: "png",
      renderUrl: "https://api.dicebear.com/9.x/thumbs/png?seed=avery",
      uploadSourceUrl: "https://api.dicebear.com/9.x/thumbs/png?seed=avery"
    });
    expect(normalizeLegacyRenderableMediaUrl("https://api.dicebear.com/9.x/thumbs/svg?seed=avery", "avatar")).toBe(
      "https://api.dicebear.com/9.x/thumbs/png?seed=avery"
    );
  });

  test("rejects untrusted legacy hosts", () => {
    expect(classifyLegacyMediaUrl("https://evil.example.com/photo.jpg", "post")).toBeNull();
    expect(classifyLegacyMediaUrl("https://evil.example.com/avatar.jpg", "avatar")).toBeNull();
  });
});
