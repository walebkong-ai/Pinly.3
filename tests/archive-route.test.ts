import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const postFindUniqueMock = vi.fn();
const postUpdateMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findUnique: postFindUniqueMock,
      update: postUpdateMock
    }
  }
}));

describe("post archive route", () => {
  beforeEach(() => {
    authMock.mockReset();
    postFindUniqueMock.mockReset();
    postUpdateMock.mockReset();
  });

  test("PATCH archives an owner post", async () => {
    authMock.mockResolvedValue({ user: { id: "owner_1" } });
    postFindUniqueMock.mockResolvedValue({
      id: "post_1",
      userId: "owner_1",
      isArchived: false
    });
    postUpdateMock.mockResolvedValue({
      id: "post_1",
      isArchived: true
    });

    const { PATCH } = await import("@/app/api/posts/[postId]/archive/route");
    const response = await PATCH(
      new Request("http://localhost/api/posts/post_1/archive", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ archived: true })
      }),
      { params: Promise.resolve({ postId: "post_1" }) }
    );

    expect(response.status).toBe(200);
    expect(postUpdateMock).toHaveBeenCalledWith({
      where: { id: "post_1" },
      data: { isArchived: true },
      select: { id: true, isArchived: true }
    });
  });

  test("PATCH restores an archived owner post", async () => {
    authMock.mockResolvedValue({ user: { id: "owner_1" } });
    postFindUniqueMock.mockResolvedValue({
      id: "post_1",
      userId: "owner_1",
      isArchived: true
    });
    postUpdateMock.mockResolvedValue({
      id: "post_1",
      isArchived: false
    });

    const { PATCH } = await import("@/app/api/posts/[postId]/archive/route");
    const response = await PATCH(
      new Request("http://localhost/api/posts/post_1/archive", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ archived: false })
      }),
      { params: Promise.resolve({ postId: "post_1" }) }
    );

    expect(response.status).toBe(200);
    expect(postUpdateMock).toHaveBeenCalledWith({
      where: { id: "post_1" },
      data: { isArchived: false },
      select: { id: true, isArchived: true }
    });
  });

  test("PATCH rejects non-owner archive attempts", async () => {
    authMock.mockResolvedValue({ user: { id: "viewer_1" } });
    postFindUniqueMock.mockResolvedValue({
      id: "post_1",
      userId: "owner_1",
      isArchived: false
    });

    const { PATCH } = await import("@/app/api/posts/[postId]/archive/route");
    const response = await PATCH(
      new Request("http://localhost/api/posts/post_1/archive", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ archived: true })
      }),
      { params: Promise.resolve({ postId: "post_1" }) }
    );

    expect(response.status).toBe(403);
    expect(postUpdateMock).not.toHaveBeenCalled();
  });
});
