import { describe, expect, test } from "vitest";
import { normalizeProfileImageUrl, normalizeStoredMediaUrl, shouldProxyMediaUrl } from "@/lib/media-url";

describe("media url hardening", () => {
  test("only proxies real blob storage hosts", () => {
    expect(shouldProxyMediaUrl("https://public.blob.vercel-storage.com/posts/file.jpg")).toBe(true);
    expect(shouldProxyMediaUrl("https://evil.example.com/?next=.blob.vercel-storage.com")).toBe(false);
  });

  test("accepts only local upload paths for relative media", () => {
    expect(normalizeStoredMediaUrl("/uploads/example.jpg")).toBe("/uploads/example.jpg");
    expect(normalizeStoredMediaUrl("/api/media?url=https://evil.example.com")).toBeNull();
  });

  test("limits avatar URLs to trusted hosts", () => {
    expect(normalizeProfileImageUrl("https://api.dicebear.com/9.x/thumbs/svg?seed=avery")).toBe(
      "https://api.dicebear.com/9.x/thumbs/svg?seed=avery"
    );
    expect(normalizeProfileImageUrl("https://evil.example.com/avatar.jpg")).toBeNull();
  });
});
