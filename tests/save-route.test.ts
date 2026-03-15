import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const getVisiblePostByIdMock = vi.fn();
const createMock = vi.fn();
const deleteManyMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/data", () => ({
  getVisiblePostById: getVisiblePostByIdMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    savedPost: {
      create: createMock,
      deleteMany: deleteManyMock
    }
  }
}));

describe("post save route", () => {
  const viewerId = "ck12345678901234567890123";

  beforeEach(() => {
    authMock.mockReset();
    getVisiblePostByIdMock.mockReset();
    createMock.mockReset();
    deleteManyMock.mockReset();

    authMock.mockResolvedValue({
      user: {
        id: viewerId
      }
    });
  });

  test("POST saves a visible post", async () => {
    getVisiblePostByIdMock.mockResolvedValue({ id: "post_1" });
    createMock.mockResolvedValue({ id: "save_1" });

    const { POST } = await import("@/app/api/posts/[postId]/save/route");
    const response = await POST(new Request("http://localhost/api/posts/post_1/save", { method: "POST" }), {
      params: Promise.resolve({ postId: "post_1" })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ saved: true });
    expect(createMock).toHaveBeenCalledWith({
      data: {
        postId: "post_1",
        userId: viewerId
      }
    });
  });

  test("POST prevents duplicate saves cleanly", async () => {
    getVisiblePostByIdMock.mockResolvedValue({ id: "post_1" });
    createMock.mockRejectedValue({ code: "P2002" });

    const { POST } = await import("@/app/api/posts/[postId]/save/route");
    const response = await POST(new Request("http://localhost/api/posts/post_1/save", { method: "POST" }), {
      params: Promise.resolve({ postId: "post_1" })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ saved: true });
  });

  test("POST rejects saving an unavailable post", async () => {
    getVisiblePostByIdMock.mockResolvedValue(null);

    const { POST } = await import("@/app/api/posts/[postId]/save/route");
    const response = await POST(new Request("http://localhost/api/posts/post_1/save", { method: "POST" }), {
      params: Promise.resolve({ postId: "post_1" })
    });

    expect(response.status).toBe(404);
    expect(createMock).not.toHaveBeenCalled();
  });

  test("DELETE removes a saved post", async () => {
    deleteManyMock.mockResolvedValue({ count: 1 });

    const { DELETE } = await import("@/app/api/posts/[postId]/save/route");
    const response = await DELETE(new Request("http://localhost/api/posts/post_1/save", { method: "DELETE" }), {
      params: Promise.resolve({ postId: "post_1" })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ saved: false });
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: {
        postId: "post_1",
        userId: viewerId
      }
    });
  });
});
