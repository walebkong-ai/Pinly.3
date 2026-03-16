import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const getVisiblePostByIdMock = vi.fn();
const commentFindUniqueMock = vi.fn();
const commentDeleteMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/data", () => ({
  getVisiblePostById: getVisiblePostByIdMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    comment: {
      findUnique: commentFindUniqueMock,
      delete: commentDeleteMock
    }
  }
}));

describe("delete comment route", () => {
  const viewerId = "ck12345678901234567890123";

  beforeEach(() => {
    authMock.mockReset();
    getVisiblePostByIdMock.mockReset();
    commentFindUniqueMock.mockReset();
    commentDeleteMock.mockReset();

    authMock.mockResolvedValue({
      user: {
        id: viewerId
      }
    });
    getVisiblePostByIdMock.mockResolvedValue({ id: "post_1", userId: "owner_1" });
    commentDeleteMock.mockResolvedValue({ id: "comment_1" });
  });

  test("comment authors can delete their own comment", async () => {
    commentFindUniqueMock.mockResolvedValue({
      id: "comment_1",
      postId: "post_1",
      parentId: null,
      userId: viewerId
    });

    const { DELETE } = await import("@/app/api/posts/[postId]/comments/[commentId]/route");
    const response = await DELETE(new Request("http://localhost/api/posts/post_1/comments/comment_1", { method: "DELETE" }), {
      params: Promise.resolve({ postId: "post_1", commentId: "comment_1" })
    });

    expect(response.status).toBe(200);
    expect(commentDeleteMock).toHaveBeenCalledWith({
      where: {
        id: "comment_1"
      }
    });
    await expect(response.json()).resolves.toEqual({
      success: true,
      deletedCommentId: "comment_1",
      parentId: null
    });
  });

  test("post owners can delete replies on their own post", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "owner_1"
      }
    });
    getVisiblePostByIdMock.mockResolvedValue({ id: "post_1", userId: "owner_1" });
    commentFindUniqueMock.mockResolvedValue({
      id: "reply_1",
      postId: "post_1",
      parentId: "comment_1",
      userId: viewerId
    });

    const { DELETE } = await import("@/app/api/posts/[postId]/comments/[commentId]/route");
    const response = await DELETE(new Request("http://localhost/api/posts/post_1/comments/reply_1", { method: "DELETE" }), {
      params: Promise.resolve({ postId: "post_1", commentId: "reply_1" })
    });

    expect(response.status).toBe(200);
    expect(commentDeleteMock).toHaveBeenCalledWith({
      where: {
        id: "reply_1"
      }
    });
  });

  test("unauthorized users cannot delete another user's comment", async () => {
    commentFindUniqueMock.mockResolvedValue({
      id: "comment_2",
      postId: "post_1",
      parentId: null,
      userId: "someone_else"
    });

    const { DELETE } = await import("@/app/api/posts/[postId]/comments/[commentId]/route");
    const response = await DELETE(new Request("http://localhost/api/posts/post_1/comments/comment_2", { method: "DELETE" }), {
      params: Promise.resolve({ postId: "post_1", commentId: "comment_2" })
    });

    expect(response.status).toBe(403);
    expect(commentDeleteMock).not.toHaveBeenCalled();
  });

  test("delete rejects comments outside the requested post", async () => {
    commentFindUniqueMock.mockResolvedValue({
      id: "comment_1",
      postId: "post_2",
      parentId: null,
      userId: viewerId
    });

    const { DELETE } = await import("@/app/api/posts/[postId]/comments/[commentId]/route");
    const response = await DELETE(new Request("http://localhost/api/posts/post_1/comments/comment_1", { method: "DELETE" }), {
      params: Promise.resolve({ postId: "post_1", commentId: "comment_1" })
    });

    expect(response.status).toBe(404);
    expect(commentDeleteMock).not.toHaveBeenCalled();
  });
});
