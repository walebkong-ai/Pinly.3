import { beforeEach, describe, expect, test, vi } from "vitest";

const { findManyMock } = vi.hoisted(() => ({
  findManyMock: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findMany: findManyMock
    }
  }
}));

import { buildOnThisDayGroups, getOnThisDayMemoryGroups } from "@/lib/on-this-day";

function createMemory({
  id,
  visitedAt,
  caption = "",
  placeName = "Kyoto Station",
  city = "Kyoto",
  country = "Japan",
  collection = null
}: {
  id: string;
  visitedAt: string;
  caption?: string;
  placeName?: string;
  city?: string;
  country?: string;
  collection?: { id: string; name: string; color: string | null } | null;
}) {
  return {
    id,
    mediaType: "IMAGE" as const,
    mediaUrl: `https://example.com/${id}.jpg`,
    thumbnailUrl: `https://example.com/${id}-thumb.jpg`,
    caption,
    placeName,
    city,
    country,
    latitude: 35.0,
    longitude: 135.0,
    visitedAt,
    createdAt: visitedAt,
    collection
  };
}

describe("on this day selector", () => {
  beforeEach(() => {
    findManyMock.mockReset();
  });

  test("excludes current-year posts and out-of-window memories", () => {
    const now = new Date("2026-03-21T12:00:00.000Z");
    const groups = buildOnThisDayGroups([
      createMemory({ id: "current-year", visitedAt: "2026-03-21T09:00:00.000Z", caption: "Too recent" }),
      createMemory({ id: "exact", visitedAt: "2025-03-21T09:00:00.000Z", caption: "Exact day" }),
      createMemory({ id: "nearby", visitedAt: "2024-03-23T09:00:00.000Z", caption: "Nearby day" }),
      createMemory({ id: "far", visitedAt: "2024-04-10T09:00:00.000Z", caption: "Too far away" })
    ], now);

    expect(groups.map((group) => group.leadPost.id)).toEqual(["exact", "nearby"]);
  });

  test("groups related memories from the same collection day and ranks them above weaker singles", () => {
    const now = new Date("2026-03-21T12:00:00.000Z");
    const collection = { id: "trip_1", name: "Kyoto Spring", color: "#38B6C9" };
    const groups = buildOnThisDayGroups([
      createMemory({
        id: "cluster-1",
        visitedAt: "2024-03-22T09:00:00.000Z",
        caption: "Sunrise walk through the station before the crowds.",
        collection
      }),
      createMemory({
        id: "cluster-2",
        visitedAt: "2024-03-22T14:00:00.000Z",
        caption: "Second stop from the same Kyoto day.",
        collection
      }),
      createMemory({
        id: "single-weak",
        visitedAt: "2025-03-21T09:00:00.000Z",
        caption: ""
      })
    ], now);

    expect(groups[0]?.memoryCount).toBe(2);
    expect(groups[0]?.collection?.name).toBe("Kyoto Spring");
    expect(["cluster-1", "cluster-2"]).toContain(groups[0]?.leadPost.id);
    expect(groups[1]?.leadPost.id).toBe("single-weak");
  });

  test("queries only the viewer's own prior-year active posts", async () => {
    findManyMock.mockResolvedValue([]);
    const now = new Date("2026-03-21T12:00:00.000Z");

    await getOnThisDayMemoryGroups("user_123", now);

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user_123",
          isArchived: false,
          visitedAt: {
            lt: new Date("2026-01-01T00:00:00.000Z")
          }
        }),
        take: 240
      })
    );
  });
});
