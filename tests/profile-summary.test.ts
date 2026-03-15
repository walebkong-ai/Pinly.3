import { describe, expect, test } from "vitest";
import { buildProfileTravelSummary } from "@/lib/profile-summary";

describe("profile travel summary", () => {
  test("builds compact travel counts, recent places, and overlap", () => {
    const profilePosts = [
      {
        id: "post_1",
        caption: "Night walk",
        placeName: "Old Port",
        city: "Montreal",
        country: "Canada",
        visitedAt: "2026-03-01T12:00:00.000Z",
        mediaType: "IMAGE" as const,
        mediaUrl: "/1.jpg",
        thumbnailUrl: null
      },
      {
        id: "post_2",
        caption: "Temple morning",
        placeName: "Senso-ji",
        city: "Tokyo",
        country: "Japan",
        visitedAt: "2026-02-10T12:00:00.000Z",
        mediaType: "IMAGE" as const,
        mediaUrl: "/2.jpg",
        thumbnailUrl: null
      },
      {
        id: "post_3",
        caption: "Coffee stop",
        placeName: "Mile End",
        city: "Montreal",
        country: "Canada",
        visitedAt: "2026-01-05T12:00:00.000Z",
        mediaType: "IMAGE" as const,
        mediaUrl: "/3.jpg",
        thumbnailUrl: null
      }
    ];

    const viewerPosts = [
      {
        city: "Montreal",
        country: "Canada"
      },
      {
        city: "Lisbon",
        country: "Portugal"
      }
    ];

    const summary = buildProfileTravelSummary(profilePosts, viewerPosts);

    expect(summary.cityCount).toBe(2);
    expect(summary.countryCount).toBe(2);
    expect(summary.recentPlaces).toHaveLength(3);
    expect(summary.recentPlaces[0]).toMatchObject({
      placeName: "Old Port",
      city: "Montreal"
    });
    expect(summary.recentMemories.map((memory) => memory.id)).toEqual(["post_1", "post_2", "post_3"]);
    expect(summary.sharedPlaces).toEqual([
      {
        city: "Montreal",
        country: "Canada"
      }
    ]);
  });

  test("handles profiles without viewer overlap", () => {
    const summary = buildProfileTravelSummary([
      {
        id: "post_1",
        caption: "Beach day",
        placeName: "Bondi",
        city: "Sydney",
        country: "Australia",
        visitedAt: "2026-03-01T12:00:00.000Z",
        mediaType: "IMAGE" as const,
        mediaUrl: "/1.jpg",
        thumbnailUrl: null
      }
    ]);

    expect(summary.cityCount).toBe(1);
    expect(summary.countryCount).toBe(1);
    expect(summary.sharedPlaces).toEqual([]);
  });
});
