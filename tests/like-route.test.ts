import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const getVisiblePostByIdMock = vi.fn();
const likeCreateMock = vi.fn();
const likeCountMock = vi.fn();
const likeDeleteManyMock = vi.fn();
const createNotificationSafelyMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/data", () => ({
  getVisiblePostById: getVisiblePostByIdMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    like: {
      create: likeCreateMock,
      count: likeCountMock,
      deleteMany: likeDeleteManyMock
    }
  }
}));

vi.mock("@/lib/notifications", () => ({
  createNotificationSafely: createNotificationSafelyMock
}));

describe("post like route", () => {
  const viewerId = "ck12345678901234567890123";

  beforeEach(() => {
    authMock.mockReset();
    getVisiblePostByIdMock.mockReset();
    likeCreateMock.mockReset();
    likeCountMock.mockReset();
    likeDeleteManyMock.mockReset();
    createNotificationSafelyMock.mockReset();

    authMock.mockResolvedValue({
      user: {
        id: viewerId
      }
    });
  });

  test("POST likes a visible post and creates a notification", async () => {
    getVisiblePostByIdMock.mockResolvedValue({ id: "post_1", userId: "owner_1" });
    likeCreateMock.mockResolvedValue({ id: "like_1" });
    likeCountMock.mockResolvedValue(4);

    const { POST } = await import("@/app/api/posts/[postId]/like/route");
    const response = await POST(new Request("http://localhost/api/posts/post_1/like", { method: "POST" }), {
      params: Promise.resolve({ postId: "post_1" })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      liked: true,
      likeCount: 4
    });
    expect(createNotificationSafelyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "owner_1",
        actorId: viewerId,
        type: "POST_LIKED",
        postId: "post_1"
      })
    );
  });

  test("DELETE removes an existing like", async () => {
    likeDeleteManyMock.mockResolvedValue({ count: 1 });
    likeCountMock.mockResolvedValue(2);

    const { DELETE } = await import("@/app/api/posts/[postId]/like/route");
    const response = await DELETE(new Request("http://localhost/api/posts/post_1/like", { method: "DELETE" }), {
      params: Promise.resolve({ postId: "post_1" })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      liked: false,
      likeCount: 2
    });
  });
});
