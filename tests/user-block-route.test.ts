import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const enforceRateLimitMock = vi.fn();
const userFindUniqueMock = vi.fn();
const friendshipDeleteManyMock = vi.fn();
const friendRequestDeleteManyMock = vi.fn();
const groupDeleteManyMock = vi.fn();
const blockUpsertMock = vi.fn();

const prismaMock = {
  user: {
    findUnique: userFindUniqueMock
  },
  friendship: {
    deleteMany: friendshipDeleteManyMock
  },
  friendRequest: {
    deleteMany: friendRequestDeleteManyMock
  },
  group: {
    deleteMany: groupDeleteManyMock
  },
  block: {
    upsert: blockUpsertMock
  },
  $transaction: vi.fn(async (callback: (tx: any) => Promise<unknown>) => callback(prismaMock))
};

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock
}));

describe("user block route", () => {
  beforeEach(() => {
    authMock.mockReset();
    enforceRateLimitMock.mockReset();
    userFindUniqueMock.mockReset();
    friendshipDeleteManyMock.mockReset();
    friendRequestDeleteManyMock.mockReset();
    groupDeleteManyMock.mockReset();
    blockUpsertMock.mockReset();
    prismaMock.$transaction.mockClear();

    authMock.mockResolvedValue({
      user: {
        id: "viewer_1"
      }
    });
    enforceRateLimitMock.mockResolvedValue(null);
    userFindUniqueMock.mockResolvedValue({
      id: "target_1"
    });
    friendshipDeleteManyMock.mockResolvedValue({ count: 1 });
    friendRequestDeleteManyMock.mockResolvedValue({ count: 1 });
    groupDeleteManyMock.mockResolvedValue({ count: 1 });
    blockUpsertMock.mockResolvedValue({ id: "block_1" });
  });

  test("blocks a user, clears friend state, and deletes direct conversations", async () => {
    const { POST } = await import("@/app/api/users/[username]/block/route");
    const response = await POST(new Request("http://localhost/api/users/maya/block", { method: "POST" }), {
      params: Promise.resolve({ username: "Maya" })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(friendshipDeleteManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { userAId: "viewer_1", userBId: "target_1" },
            { userAId: "target_1", userBId: "viewer_1" }
          ])
        })
      })
    );
    expect(friendRequestDeleteManyMock).toHaveBeenCalled();
    expect(groupDeleteManyMock).toHaveBeenCalledWith({
      where: {
        isDirect: true,
        directPairKey: "target_1:viewer_1"
      }
    });
    expect(blockUpsertMock).toHaveBeenCalledWith({
      where: {
        blockerId_blockedId: {
          blockerId: "viewer_1",
          blockedId: "target_1"
        }
      },
      update: {},
      create: {
        blockerId: "viewer_1",
        blockedId: "target_1"
      }
    });
  });

  test("rejects attempts to block yourself", async () => {
    userFindUniqueMock.mockResolvedValue({
      id: "viewer_1"
    });

    const { POST } = await import("@/app/api/users/[username]/block/route");
    const response = await POST(new Request("http://localhost/api/users/avery/block", { method: "POST" }), {
      params: Promise.resolve({ username: "avery" })
    });

    expect(response.status).toBe(400);
    expect(blockUpsertMock).not.toHaveBeenCalled();
  });
});
