import { describe, expect, test } from "vitest";
import { derivePostCategories, filterPostsByCategories } from "@/lib/map-filters";
import { TEST_IMAGE_URL } from "@/tests/fixtures/media";
import type { PostSummary } from "@/types/app";

function makePost(overrides: Partial<PostSummary>): PostSummary {
  return {
    id: overrides.id ?? "post-1",
    userId: overrides.userId ?? "user-1",
    mediaType: overrides.mediaType ?? "IMAGE",
    mediaUrl: overrides.mediaUrl ?? TEST_IMAGE_URL,
    thumbnailUrl: overrides.thumbnailUrl ?? null,
    caption: overrides.caption ?? "Morning coffee before the museum.",
    placeName: overrides.placeName ?? "Cafe de Paris",
    city: overrides.city ?? "Paris",
    country: overrides.country ?? "France",
    latitude: overrides.latitude ?? 48.8566,
    longitude: overrides.longitude ?? 2.3522,
    visitedAt: overrides.visitedAt ?? new Date("2025-01-10T12:00:00.000Z"),
    createdAt: overrides.createdAt ?? new Date("2025-01-11T12:00:00.000Z"),
    user: overrides.user ?? {
      id: "user-1",
      name: "Avery Chen",
      username: "avery",
      avatarUrl: null
    }
  };
}

describe("map categories", () => {
  test("derives semantic categories from post content", () => {
    const post = makePost({});
    const categories = derivePostCategories(post);

    expect(categories).toContain("photo");
    expect(categories).toContain("food");
  });

  test("filters posts by selected categories", () => {
    const posts = [
      makePost({ id: "photo-food" }),
      makePost({
        id: "video-nature",
        mediaType: "VIDEO",
        placeName: "Canal Walk",
        caption: "Quiet water and trees all morning."
      })
    ];

    const filtered = filterPostsByCategories(posts, ["video", "nature"]);

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("video-nature");
  });
});
