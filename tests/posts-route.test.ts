import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const getFriendIdsMock = vi.fn();
const getMapDataMock = vi.fn();
const postCreateMock = vi.fn();
const postCollectionFindManyMock = vi.fn();
const postCollectionUpdateManyMock = vi.fn();

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
    },
    postCollection: {
      findMany: postCollectionFindManyMock,
      updateMany: postCollectionUpdateManyMock
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
    postCollectionFindManyMock.mockReset();
    postCollectionUpdateManyMock.mockReset();

    authMock.mockResolvedValue({
      user: {
        id: viewerId
      }
    });
  });

  test("POST creates a post with deduped visited-with friends", async () => {
    getFriendIdsMock.mockResolvedValue([friendId]);
    postCollectionFindManyMock.mockResolvedValue([]);
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
    postCollectionFindManyMock.mockResolvedValue([]);

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

  test("POST normalizes country codes before saving", async () => {
    getFriendIdsMock.mockResolvedValue([]);
    postCollectionFindManyMock.mockResolvedValue([]);
    postCreateMock.mockResolvedValue({
      id: "post_1",
      visitedWith: []
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
          caption: "Harbor morning.",
          placeName: "North Shore",
          city: "Auckland",
          country: "NZ",
          latitude: -36.8,
          longitude: 174.7,
          visitedAt: new Date().toISOString(),
          taggedUserIds: []
        })
      })
    );

    expect(response.status).toBe(201);
    expect(postCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          country: "New Zealand"
        })
      })
    );
  });

  test("POST adds a new memory to selected collections", async () => {
    const collectionId = "ck77777777777777777777777";
    getFriendIdsMock.mockResolvedValue([]);
    postCollectionFindManyMock.mockResolvedValue([{ id: collectionId }]);
    postCreateMock.mockResolvedValue({
      id: "post_1",
      visitedWith: []
    });
    postCollectionUpdateManyMock.mockResolvedValue({ count: 1 });

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
          taggedUserIds: [],
          collectionIds: [collectionId, collectionId]
        })
      })
    );

    expect(response.status).toBe(201);
    expect(postCollectionFindManyMock).toHaveBeenCalledWith({
      where: {
        userId: viewerId,
        id: { in: [collectionId] }
      },
      select: { id: true }
    });
    expect(postCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          collectionEntries: {
            create: [{ collectionId }]
          }
        })
      })
    );
    expect(postCollectionUpdateManyMock).toHaveBeenCalled();
  });

  test("POST rejects using someone else's collection", async () => {
    const collectionId = "ck77777777777777777777777";
    getFriendIdsMock.mockResolvedValue([]);
    postCollectionFindManyMock.mockResolvedValue([]);

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
          collectionIds: [collectionId]
        })
      })
    );

    expect(response.status).toBe(403);
    expect(postCreateMock).not.toHaveBeenCalled();
  });
});
