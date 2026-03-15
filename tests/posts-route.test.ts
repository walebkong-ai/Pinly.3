import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const getFriendIdsMock = vi.fn();
const getMapDataMock = vi.fn();
const postCreateMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/data", () => ({
  getFriendIds: getFriendIdsMock,
  getMapData: getMapDataMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      create: postCreateMock
    }
  }
}));

describe("posts route", () => {
  const viewerId = "ck12345678901234567890123";
  const friendId = "ck99999999999999999999999";

  beforeEach(() => {
    authMock.mockReset();
    getFriendIdsMock.mockReset();
    getMapDataMock.mockReset();
    postCreateMock.mockReset();

    authMock.mockResolvedValue({
      user: {
        id: viewerId
      }
    });
  });

  test("POST creates a post with deduped visited-with friends", async () => {
    getFriendIdsMock.mockResolvedValue([friendId]);
    postCreateMock.mockResolvedValue({
      id: "post_1",
      visitedWith: [
        {
          user: {
            id: friendId,
            name: "Jordan",
            username: "jordan",
            avatarUrl: null
          }
        }
      ]
    });

    const { POST } = await import("@/app/api/posts/route");
    const response = await POST(
      new Request("http://localhost/api/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mediaType: "IMAGE",
          mediaUrl: "/uploads/example.jpg",
          thumbnailUrl: null,
          caption: "A full day in the city.",
          placeName: "Old Port",
          city: "Montreal",
          country: "Canada",
          latitude: 45.5,
          longitude: -73.55,
          visitedAt: new Date().toISOString(),
          taggedUserIds: [friendId, friendId, viewerId]
        })
      })
    );

    expect(response.status).toBe(201);
    expect(postCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: viewerId,
          visitedWith: {
            create: [{ userId: friendId }]
          }
        })
      })
    );
  });

  test("POST rejects tagging non-friends", async () => {
    getFriendIdsMock.mockResolvedValue([]);

    const { POST } = await import("@/app/api/posts/route");
    const response = await POST(
      new Request("http://localhost/api/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mediaType: "IMAGE",
          mediaUrl: "/uploads/example.jpg",
          thumbnailUrl: null,
          caption: "A full day in the city.",
          placeName: "Old Port",
          city: "Montreal",
          country: "Canada",
          latitude: 45.5,
          longitude: -73.55,
          visitedAt: new Date().toISOString(),
          taggedUserIds: [friendId]
        })
      })
    );

    expect(response.status).toBe(403);
    expect(postCreateMock).not.toHaveBeenCalled();
  });
});
