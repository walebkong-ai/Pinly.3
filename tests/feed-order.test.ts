import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  blockedUserIdsMock,
  commentGroupByMock,
  getVisibleUserIdsForViewerMock,
  likeFindManyMock,
  likeGroupByMock,
  postFindManyMock,
  savedPostFindManyMock
} = vi.hoisted(() => ({
  blockedUserIdsMock: vi.fn(),
  commentGroupByMock: vi.fn(),
  getVisibleUserIdsForViewerMock: vi.fn(),
  likeFindManyMock: vi.fn(),
  likeGroupByMock: vi.fn(),
  postFindManyMock: vi.fn(),
  savedPostFindManyMock: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findMany: postFindManyMock
    },
    savedPost: {
      findMany: savedPostFindManyMock
    },
    comment: {
      groupBy: commentGroupByMock
    },
    like: {
      findMany: likeFindManyMock,
      groupBy: likeGroupByMock
    }
  }
}));

vi.mock("@/lib/relationships", () => ({
  getFriendIdsForViewer: vi.fn(),
  getRelationshipDetails: vi.fn(),
  getVisibleUserIdsForViewer: getVisibleUserIdsForViewerMock
}));

vi.mock("@/lib/user-safety", () => ({
  areUsersBlocked: vi.fn(),
  getBlockedUserIdsForViewer: blockedUserIdsMock
}));

import { getRecentFeedPosts } from "@/lib/data";

function buildPost(id: string, createdAt: string, userId = "viewer_1") {
  return {
    id,
    userId,
    mediaType: "IMAGE",
    mediaUrl: "/demo-media/posts/paris-cafe.jpg",
    thumbnailUrl: null,
    caption: id,
    placeName: "Cafe Kitsune",
    city: "Paris",
    country: "France",
    latitude: 48.8566,
    longitude: 2.3522,
    visitedAt: new Date(createdAt),
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt),
    isArchived: false,
    user: {
      id: userId,
      name: "Avery Chen",
      username: "avery",
      avatarUrl: null,
      settings: {
        commentsEnabled: true
      }
    },
    visitedWith: []
  };
}

describe("feed ordering", () => {
  beforeEach(() => {
    getVisibleUserIdsForViewerMock.mockReset();
    postFindManyMock.mockReset();
    savedPostFindManyMock.mockReset();
    commentGroupByMock.mockReset();
    likeFindManyMock.mockReset();
    likeGroupByMock.mockReset();
    blockedUserIdsMock.mockReset();

    getVisibleUserIdsForViewerMock.mockResolvedValue(["viewer_1", "friend_1"]);
    savedPostFindManyMock.mockResolvedValue([]);
    commentGroupByMock.mockResolvedValue([]);
    likeFindManyMock.mockResolvedValue([{ postId: "liked_newer" }]);
    likeGroupByMock.mockResolvedValue([{ postId: "liked_newer", _count: { _all: 1 } }]);
    blockedUserIdsMock.mockResolvedValue(new Set<string>());
  });

  test("shows newest unliked posts before liked posts", async () => {
    const unlikedOlder = buildPost("unliked_older", "2026-04-20T12:00:00.000Z");
    const unlikedNewest = buildPost("unliked_newest", "2026-04-25T12:00:00.000Z");
    const likedNewer = buildPost("liked_newer", "2026-04-26T12:00:00.000Z");

    postFindManyMock
      .mockResolvedValueOnce([unlikedNewest, unlikedOlder])
      .mockResolvedValueOnce([likedNewer]);

    const posts = await getRecentFeedPosts("viewer_1", 3);

    expect(postFindManyMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          userId: { in: ["viewer_1", "friend_1"] },
          isArchived: false,
          likes: { none: { userId: "viewer_1" } }
        }),
        orderBy: { createdAt: "desc" },
        take: 3
      })
    );
    expect(postFindManyMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          likes: { some: { userId: "viewer_1" } }
        }),
        orderBy: { createdAt: "desc" },
        take: 1
      })
    );
    expect(posts.map((post) => post.id)).toEqual(["unliked_newest", "unliked_older", "liked_newer"]);
    expect(posts[2]?.likedByViewer).toBe(true);
  });

  test("does not query liked posts when unliked posts fill the feed", async () => {
    postFindManyMock.mockResolvedValueOnce([
      buildPost("unliked_newest", "2026-04-25T12:00:00.000Z"),
      buildPost("unliked_older", "2026-04-20T12:00:00.000Z")
    ]);

    await getRecentFeedPosts("viewer_1", 2);

    expect(postFindManyMock).toHaveBeenCalledTimes(1);
  });
});
