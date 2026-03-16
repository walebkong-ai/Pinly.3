import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const getVisiblePostByIdMock = vi.fn();
const findManyMock = vi.fn();
const findFirstMock = vi.fn();
const createMock = vi.fn();
const createNotificationSafelyMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/data", () => ({
  getVisiblePostById: getVisiblePostByIdMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    comment: {
      findMany: findManyMock,
      findFirst: findFirstMock,
      create: createMock
    }
  }
}));

vi.mock("@/lib/notifications", () => ({
  createNotificationSafely: createNotificationSafelyMock
}));

describe("post comments route", () => {
  beforeEach(() => {
    authMock.mockReset();
    getVisiblePostByIdMock.mockReset();
    findManyMock.mockReset();
    findFirstMock.mockReset();
    createMock.mockReset();
    createNotificationSafelyMock.mockReset();

    authMock.mockResolvedValue({ user: { id: "viewer_1" } });
  });

  test("GET rejects access when the author disabled comments", async () => {
    getVisiblePostByIdMock.mockResolvedValue({
      id: "post_1",
      user: {
        settings: {
          commentsEnabled: false
        }
      }
    });

    const { GET } = await import("@/app/api/posts/[postId]/comments/route");
    const response = await GET(new Request("http://localhost/api/posts/post_1/comments"), {
      params: Promise.resolve({ postId: "post_1" })
    });

    expect(response.status).toBe(403);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  test("GET returns comments with moderation context for the viewer", async () => {
    getVisiblePostByIdMock.mockResolvedValue({
      id: "post_1",
      userId: "owner_1",
      user: {
        settings: {
          commentsEnabled: true
        }
      }
    });
    findManyMock.mockResolvedValue([
      {
        id: "comment_1",
        content: "Looks amazing",
        createdAt: new Date().toISOString(),
        user: {
          id: "viewer_1",
          name: "Avery Chen",
          username: "avery",
          avatarUrl: null
        },
        replies: []
      }
    ]);

    const { GET } = await import("@/app/api/posts/[postId]/comments/route");
    const response = await GET(new Request("http://localhost/api/posts/post_1/comments"), {
      params: Promise.resolve({ postId: "post_1" })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      comments: [
        expect.objectContaining({
          id: "comment_1",
          replies: []
        })
      ],
      currentUserId: "viewer_1",
      postOwnerId: "owner_1"
    });
  });

  test("POST creates a comment when comments are enabled", async () => {
    getVisiblePostByIdMock.mockResolvedValue({
      id: "post_2",
      userId: "owner_1",
      user: {
        settings: {
          commentsEnabled: true
        }
      }
    });

    createMock.mockResolvedValue({
      id: "comment_1",
      content: "Looks amazing",
      createdAt: new Date().toISOString(),
      user: {
        id: "viewer_1",
        name: "Avery Chen",
        username: "avery",
        avatarUrl: null
      }
    });

    const { POST } = await import("@/app/api/posts/[postId]/comments/route");
    const response = await POST(
      new Request("http://localhost/api/posts/post_2/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: "Looks amazing" })
      }),
      {
        params: Promise.resolve({ postId: "post_2" })
      }
    );

    expect(response.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          postId: "post_2",
          userId: "viewer_1",
          content: "Looks amazing",
          parentId: null
        }
      })
    );
    expect(createNotificationSafelyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "owner_1",
        actorId: "viewer_1",
        type: "POST_COMMENTED",
        postId: "post_2"
      })
    );
  });

  test("POST creates a reply when the parent comment is top-level", async () => {
    getVisiblePostByIdMock.mockResolvedValue({
      id: "post_3",
      userId: "owner_1",
      user: {
        settings: {
          commentsEnabled: true
        }
      }
    });
    findFirstMock.mockResolvedValue({
      id: "comment_parent",
      parentId: null,
      userId: "parent_1"
    });
    createMock.mockResolvedValue({
      id: "comment_reply",
      content: "Same here",
      createdAt: new Date().toISOString(),
      parentId: "comment_parent",
      user: {
        id: "viewer_1",
        name: "Avery Chen",
        username: "avery",
        avatarUrl: null
      }
    });

    const { POST } = await import("@/app/api/posts/[postId]/comments/route");
    const response = await POST(
      new Request("http://localhost/api/posts/post_3/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: "Same here", parentId: "comment_parent" })
      }),
      {
        params: Promise.resolve({ postId: "post_3" })
      }
    );

    expect(response.status).toBe(201);
    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "comment_parent",
          postId: "post_3"
        }
      })
    );
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          postId: "post_3",
          userId: "viewer_1",
          content: "Same here",
          parentId: "comment_parent"
        }
      })
    );
    expect(createNotificationSafelyMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        userId: "parent_1",
        actorId: "viewer_1",
        type: "COMMENT_REPLIED",
        postId: "post_3"
      })
    );
    expect(createNotificationSafelyMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        userId: "owner_1",
        actorId: "viewer_1",
        type: "POST_COMMENTED",
        postId: "post_3"
      })
    );
  });
});
