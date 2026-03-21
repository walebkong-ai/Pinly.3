import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const {
  postCollectionFindManyMock,
  postFindManyMock,
  friendshipFindManyMock,
  friendRequestFindManyMock,
  blockFindManyMock
} = vi.hoisted(() => ({
  postCollectionFindManyMock: vi.fn(),
  postFindManyMock: vi.fn(),
  friendshipFindManyMock: vi.fn(),
  friendRequestFindManyMock: vi.fn(),
  blockFindManyMock: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    postCollection: {
      findMany: postCollectionFindManyMock
    },
    post: {
      findMany: postFindManyMock
    },
    friendship: {
      findMany: friendshipFindManyMock
    },
    friendRequest: {
      findMany: friendRequestFindManyMock
    },
    block: {
      findMany: blockFindManyMock
    }
  }
}));

import { getMapCollectionOverlays, getMapData } from "@/lib/data";

describe("map collections overlay data", () => {
  const viewerId = "viewer_1";
  const acceptedFriendId = "friend_1";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-21T12:00:00.000Z"));
    postCollectionFindManyMock.mockReset();
    postFindManyMock.mockReset();
    friendshipFindManyMock.mockReset();
    friendRequestFindManyMock.mockReset();
    blockFindManyMock.mockReset();

    friendshipFindManyMock.mockResolvedValue([{ userAId: viewerId, userBId: acceptedFriendId }]);
    friendRequestFindManyMock.mockResolvedValue([]);
    blockFindManyMock.mockResolvedValue([]);
    postFindManyMock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("loads only accepted-friend collections in friends mode", async () => {
    const updatedAt = new Date("2026-03-19T12:00:00.000Z");
    const visitedAt = new Date("2026-03-15T12:00:00.000Z");

    postCollectionFindManyMock.mockResolvedValue([
      {
        id: "collection_1",
        userId: acceptedFriendId,
        name: "Maya in Tokyo",
        color: "#F97316",
        updatedAt,
        posts: [
          {
            post: {
              id: "post_1",
              latitude: 35.6595,
              longitude: 139.7005,
              visitedAt
            }
          }
        ]
      }
    ]);

    await expect(
      getMapCollectionOverlays({
        viewerId,
        layer: "friends",
        groups: [],
        time: "all"
      })
    ).resolves.toEqual([
      {
        id: "collection_1",
        ownerId: acceptedFriendId,
        name: "Maya in Tokyo",
        color: "#F97316",
        updatedAt,
        postIds: ["post_1"],
        routePoints: [
          {
            postId: "post_1",
            latitude: 35.6595,
            longitude: 139.7005,
            visitedAt
          }
        ]
      }
    ]);

    expect(friendRequestFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "ACCEPTED"
        })
      })
    );
    expect(postCollectionFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            {
              userId: { in: [acceptedFriendId] },
              OR: [{ visibility: "public" }, { visibility: "friends" }]
            }
          ])
        })
      })
    );
  });

  test("applies the active time filter to collection overlay route points", async () => {
    const updatedAt = new Date("2026-03-19T12:00:00.000Z");
    const inRangeVisitedAt = new Date("2026-03-09T12:00:00.000Z");

    postCollectionFindManyMock.mockResolvedValue([
      {
        id: "collection_2",
        userId: viewerId,
        name: "Avery spring trip",
        color: "#3A6EC9",
        updatedAt,
        posts: [
          {
            post: {
              id: "post_recent",
              latitude: 35.017,
              longitude: 135.6774,
              visitedAt: inRangeVisitedAt
            }
          }
        ]
      }
    ]);

    await expect(
      getMapCollectionOverlays({
        viewerId,
        layer: "you",
        groups: [],
        time: "30d"
      })
    ).resolves.toEqual([
      {
        id: "collection_2",
        ownerId: viewerId,
        name: "Avery spring trip",
        color: "#3A6EC9",
        updatedAt,
        postIds: ["post_recent"],
        routePoints: [
          {
            postId: "post_recent",
            latitude: 35.017,
            longitude: 135.6774,
            visitedAt: inRangeVisitedAt
          }
        ]
      }
    ]);

    const calledArgs = postCollectionFindManyMock.mock.calls[0]?.[0];
    const cutoffFromCollectionWhere = calledArgs?.where?.AND?.[1]?.posts?.some?.post?.visitedAt?.gte;
    const cutoffFromPostSelectWhere = calledArgs?.select?.posts?.where?.post?.visitedAt?.gte;

    expect(calledArgs?.where?.AND).toEqual(
      expect.arrayContaining([
        {
          userId: viewerId
        },
        {
          posts: {
            some: {
              post: expect.objectContaining({
                isArchived: false,
                visitedAt: {
                  gte: expect.any(Date)
                }
              })
            }
          }
        }
      ])
    );
    expect(cutoffFromCollectionWhere).toBeInstanceOf(Date);
    expect(cutoffFromCollectionWhere.toISOString().startsWith("2026-02-19")).toBe(true);
    expect(cutoffFromPostSelectWhere).toBeInstanceOf(Date);
    expect(cutoffFromPostSelectWhere.toISOString().startsWith("2026-02-19")).toBe(true);
  });

  test("filters map posts down to visible collection memberships when the overlay is active", async () => {
    await getMapData({
      viewerId,
      bounds: { north: 49, south: 40, east: -70, west: -80 },
      zoom: 7,
      layer: "both",
      time: "all",
      groups: [],
      categories: [],
      collectionOverlay: true
    });

    expect(postFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            {
              userId: { in: [viewerId, acceptedFriendId] }
            },
            {
              collectionEntries: {
                some: {
                  collection: {
                    OR: [
                      { userId: viewerId },
                      {
                        userId: { in: [acceptedFriendId] },
                        OR: [{ visibility: "public" }, { visibility: "friends" }]
                      }
                    ]
                  }
                }
              }
            }
          ])
        })
      })
    );
  });
});
