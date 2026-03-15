import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const getVisiblePostByIdMock = vi.fn();
const findManyMock = vi.fn();
const createMock = vi.fn();

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
      create: createMock
    }
  }
}));

describe("post comments route", () => {
  beforeEach(() => {
    authMock.mockReset();
    getVisiblePostByIdMock.mockReset();
    findManyMock.mockReset();
    createMock.mockReset();

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

  test("POST creates a comment when comments are enabled", async () => {
    getVisiblePostByIdMock.mockResolvedValue({
      id: "post_2",
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
          content: "Looks amazing"
        }
      })
    );
  });
});
