import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const getVisibleUserIdsMock = vi.fn();
const friendRequestFindManyMock = vi.fn();
const userFindManyMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/data", () => ({
  getVisibleUserIds: getVisibleUserIdsMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    friendRequest: {
      findMany: friendRequestFindManyMock
    },
    user: {
      findMany: userFindManyMock
    }
  }
}));

describe("friends search route", () => {
  const viewerId = "ck12345678901234567890123";

  beforeEach(() => {
    authMock.mockReset();
    getVisibleUserIdsMock.mockReset();
    friendRequestFindManyMock.mockReset();
    userFindManyMock.mockReset();

    authMock.mockResolvedValue({
      user: {
        id: viewerId
      }
    });
    getVisibleUserIdsMock.mockResolvedValue([viewerId, "ckfriend00000000000000001"]);
    friendRequestFindManyMock.mockResolvedValue([
      {
        fromUserId: "ckpending0000000000000001",
        toUserId: viewerId,
        status: "PENDING"
      }
    ]);
  });

  test("returns ranked users with friendship state", async () => {
    userFindManyMock.mockResolvedValue([
      {
        id: "ckpending0000000000000001",
        name: "Alexa Stone",
        username: "stonealexa",
        avatarUrl: null
      },
      {
        id: "ckfriend00000000000000001",
        name: "Jordan Lake",
        username: "alexj",
        avatarUrl: null
      }
    ]);

    const { GET } = await import("@/app/api/friends/search/route");
    const response = await GET(new Request("http://localhost/api/friends/search?q=alex"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.users).toEqual([
      expect.objectContaining({
        id: "ckfriend00000000000000001",
        requestStatus: "friends"
      }),
      expect.objectContaining({
        id: "ckpending0000000000000001",
        requestStatus: "pending_received"
      })
    ]);
  });

  test("skips database work for too-short queries", async () => {
    const { GET } = await import("@/app/api/friends/search/route");
    const response = await GET(new Request("http://localhost/api/friends/search?q=a"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ users: [] });
    expect(friendRequestFindManyMock).not.toHaveBeenCalled();
    expect(userFindManyMock).not.toHaveBeenCalled();
  });
});
