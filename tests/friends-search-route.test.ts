import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const getRelationshipDetailsForTargetsMock = vi.fn();
const blockFindManyMock = vi.fn();
const userFindManyMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/relationships", () => ({
  getRelationshipDetailsForTargets: getRelationshipDetailsForTargetsMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    block: {
      findMany: blockFindManyMock
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
    getRelationshipDetailsForTargetsMock.mockReset();
    blockFindManyMock.mockReset();
    userFindManyMock.mockReset();

    authMock.mockResolvedValue({
      user: {
        id: viewerId
      }
    });
    blockFindManyMock.mockResolvedValue([]);
    getRelationshipDetailsForTargetsMock.mockResolvedValue(
      new Map([
        [
          "ckpending0000000000000001",
          {
            targetUserId: "ckpending0000000000000001",
            status: "pending_received",
            activeRequestId: "ckreq000000000000000000001"
          }
        ],
        [
          "ckfriend00000000000000001",
          {
            targetUserId: "ckfriend00000000000000001",
            status: "friends",
            activeRequestId: null
          }
        ]
      ])
    );
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
    expect(getRelationshipDetailsForTargetsMock).toHaveBeenCalledWith(viewerId, [
      "ckpending0000000000000001",
      "ckfriend00000000000000001"
    ]);
    expect(data.users).toEqual([
      expect.objectContaining({
        id: "ckfriend00000000000000001",
        requestStatus: "friends"
      }),
      expect.objectContaining({
        id: "ckpending0000000000000001",
        requestStatus: "pending_received",
        requestId: "ckreq000000000000000000001"
      })
    ]);
  });

  test("skips database work for too-short queries", async () => {
    const { GET } = await import("@/app/api/friends/search/route");
    const response = await GET(new Request("http://localhost/api/friends/search?q=a"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ users: [] });
    expect(getRelationshipDetailsForTargetsMock).not.toHaveBeenCalled();
    expect(userFindManyMock).not.toHaveBeenCalled();
  });
});
