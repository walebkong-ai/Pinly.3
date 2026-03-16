import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const getVisiblePostByIdMock = vi.fn();
const getFriendIdsMock = vi.fn();
const findUniqueMock = vi.fn();
const updateMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/data", () => ({
  getVisiblePostById: getVisiblePostByIdMock,
  getFriendIds: getFriendIdsMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findUnique: findUniqueMock,
      update: updateMock
    }
  }
}));

describe("single post route", () => {
  const viewerId = "ck12345678901234567890123";
  const friendId = "ck99999999999999999999999";
  const legacyTaggedUserId = "ck88888888888888888888888";

  beforeEach(() => {
    authMock.mockReset();
    getVisiblePostByIdMock.mockReset();
    getFriendIdsMock.mockReset();
    findUniqueMock.mockReset();
    updateMock.mockReset();

    authMock.mockResolvedValue({
      user: {
        id: viewerId
      }
    });
  });

  test("PATCH updates owner-editable fields and dedupes visited-with tags", async () => {
    findUniqueMock.mockResolvedValue({
      userId: viewerId,
      visitedWith: []
    });
    getFriendIdsMock.mockResolvedValue([friendId]);
    updateMock.mockResolvedValue({
      id: "post_1",
      caption: "Updated memory copy",
      placeName: "Old Port",
      city: "Montreal",
      country: "Canada",
      latitude: 45.5,
      longitude: -73.55,
      visitedAt: new Date("2026-03-10T12:00:00.000Z"),
      user: {
        id: viewerId,
        name: "Avery Chen",
        username: "avery",
        avatarUrl: null
      },
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

    const { PATCH } = await import("@/app/api/posts/[postId]/route");
    const response = await PATCH(
      new Request("http://localhost/api/posts/post_1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          caption: "Updated memory copy",
          placeName: "Old Port",
          city: "Montreal",
          country: "Canada",
          latitude: 45.5,
          longitude: -73.55,
          visitedAt: "2026-03-10T12:00:00.000Z",
          taggedUserIds: [friendId, friendId, viewerId]
        })
      }),
      {
        params: Promise.resolve({ postId: "post_1" })
      }
    );

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "post_1" },
        data: expect.objectContaining({
          caption: "Updated memory copy",
          placeName: "Old Port",
          city: "Montreal",
          country: "Canada",
          latitude: 45.5,
          longitude: -73.55,
          visitedWith: {
            deleteMany: {},
            create: [{ userId: friendId }]
          }
        })
      })
    );
  });

  test("PATCH rejects edits from non-owners", async () => {
    findUniqueMock.mockResolvedValue({
      userId: "someone_else",
      visitedWith: []
    });

    const { PATCH } = await import("@/app/api/posts/[postId]/route");
    const response = await PATCH(
      new Request("http://localhost/api/posts/post_1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          caption: "Updated memory copy",
          placeName: "Old Port",
          city: "Montreal",
          country: "Canada",
          latitude: 45.5,
          longitude: -73.55,
          visitedAt: "2026-03-10T12:00:00.000Z",
          taggedUserIds: []
        })
      }),
      {
        params: Promise.resolve({ postId: "post_1" })
      }
    );

    expect(response.status).toBe(403);
    expect(updateMock).not.toHaveBeenCalled();
  });

  test("PATCH allows already-tagged users to remain when saving edits", async () => {
    findUniqueMock.mockResolvedValue({
      userId: viewerId,
      visitedWith: [{ userId: legacyTaggedUserId }]
    });
    getFriendIdsMock.mockResolvedValue([friendId]);
    updateMock.mockResolvedValue({
      id: "post_1",
      caption: "Caption only change",
      placeName: "Old Port",
      city: "Montreal",
      country: "Canada",
      latitude: 45.5,
      longitude: -73.55,
      visitedAt: new Date("2026-03-10T12:00:00.000Z"),
      user: {
        id: viewerId,
        name: "Avery Chen",
        username: "avery",
        avatarUrl: null
      },
      visitedWith: [
        {
          user: {
            id: legacyTaggedUserId,
            name: "Taylor",
            username: "taylor",
            avatarUrl: null
          }
        }
      ]
    });

    const { PATCH } = await import("@/app/api/posts/[postId]/route");
    const response = await PATCH(
      new Request("http://localhost/api/posts/post_1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          caption: "Caption only change",
          placeName: "Old Port",
          city: "Montreal",
          country: "Canada",
          latitude: 45.5,
          longitude: -73.55,
          visitedAt: "2026-03-10T12:00:00.000Z",
          taggedUserIds: [legacyTaggedUserId]
        })
      }),
      {
        params: Promise.resolve({ postId: "post_1" })
      }
    );

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          visitedWith: {
            deleteMany: {},
            create: [{ userId: legacyTaggedUserId }]
          }
        })
      })
    );
  });

  test("PATCH rejects adding a new non-friend tag", async () => {
    findUniqueMock.mockResolvedValue({
      userId: viewerId,
      visitedWith: []
    });
    getFriendIdsMock.mockResolvedValue([]);

    const { PATCH } = await import("@/app/api/posts/[postId]/route");
    const response = await PATCH(
      new Request("http://localhost/api/posts/post_1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          caption: "Updated memory copy",
          placeName: "Old Port",
          city: "Montreal",
          country: "Canada",
          latitude: 45.5,
          longitude: -73.55,
          visitedAt: "2026-03-10T12:00:00.000Z",
          taggedUserIds: [friendId]
        })
      }),
      {
        params: Promise.resolve({ postId: "post_1" })
      }
    );

    expect(response.status).toBe(403);
    expect(updateMock).not.toHaveBeenCalled();
  });
});
