import { beforeEach, describe, expect, test, vi } from "vitest";

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
        groups: []
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
