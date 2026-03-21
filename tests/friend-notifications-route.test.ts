import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const userFindUniqueMock = vi.fn();
const friendRequestFindUniqueMock = vi.fn();
const friendRequestUpsertMock = vi.fn();
const friendRequestUpdateManyMock = vi.fn();
const friendshipUpsertMock = vi.fn();
const friendshipDeleteManyMock = vi.fn();
const getRelationshipDetailsMock = vi.fn();
const createNotificationSafelyMock = vi.fn();

const prismaMock = {
  user: {
    findUnique: userFindUniqueMock
  },
  friendRequest: {
    findUnique: friendRequestFindUniqueMock,
    upsert: friendRequestUpsertMock,
    updateMany: friendRequestUpdateManyMock
  },
  friendship: {
    upsert: friendshipUpsertMock,
    deleteMany: friendshipDeleteManyMock
  },
  $transaction: vi.fn(async (callback: (tx: any) => Promise<unknown>) => callback(prismaMock))
};

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock
}));

vi.mock("@/lib/relationships", () => ({
  getRelationshipDetails: getRelationshipDetailsMock
}));

vi.mock("@/lib/notifications", () => ({
  createNotificationSafely: createNotificationSafelyMock
}));

describe("friend request notification routes", () => {
  const viewerId = "ck12345678901234567890123";
  const otherUserId = "ck99999999999999999999999";
  const requestId = "ck77777777777777777777777";

  beforeEach(() => {
    authMock.mockReset();
    userFindUniqueMock.mockReset();
    friendRequestFindUniqueMock.mockReset();
    friendRequestUpsertMock.mockReset();
    friendRequestUpdateManyMock.mockReset();
    friendshipUpsertMock.mockReset();
    friendshipDeleteManyMock.mockReset();
    getRelationshipDetailsMock.mockReset();
    createNotificationSafelyMock.mockReset();
    prismaMock.$transaction.mockClear();

    authMock.mockResolvedValue({
      user: {
        id: viewerId
      }
    });
    getRelationshipDetailsMock.mockResolvedValue({
      targetUserId: otherUserId,
      status: "none",
      isFriend: false,
      isBlocked: false,
      incomingRequestId: null,
      outgoingRequestId: null,
      activeRequestId: null
    });
    friendshipDeleteManyMock.mockResolvedValue({ count: 0 });
  });

  test("sending a friend request creates a received notification", async () => {
    userFindUniqueMock.mockResolvedValue({
      id: otherUserId,
      username: "jordan"
    });
    friendRequestUpsertMock.mockResolvedValue({
      id: requestId,
      toUser: {
        id: otherUserId,
        name: "Jordan",
        username: "jordan",
        avatarUrl: null
      }
    });

    const { POST } = await import("@/app/api/friends/request/route");
    const response = await POST(
      new Request("http://localhost/api/friends/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "jordan" })
      })
    );

    expect(response.status).toBe(201);
    expect(friendRequestUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { status: "PENDING" },
        create: {
          fromUserId: viewerId,
          toUserId: otherUserId
        }
      })
    );
    expect(createNotificationSafelyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: otherUserId,
        actorId: viewerId,
        type: "FRIEND_REQUEST_RECEIVED",
        friendRequestId: requestId
      })
    );
  });

  test("accepting a friend request creates an accepted notification", async () => {
    friendRequestFindUniqueMock.mockResolvedValue({
      id: requestId,
      fromUserId: otherUserId,
      toUserId: viewerId,
      status: "PENDING"
    });
    friendRequestUpdateManyMock.mockResolvedValue({ count: 1 });
    friendshipUpsertMock.mockResolvedValue({ id: "friendship_1" });

    const { POST } = await import("@/app/api/friends/respond/route");
    const response = await POST(
      new Request("http://localhost/api/friends/respond", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestId,
          action: "accept"
        })
      })
    );

    expect(response.status).toBe(200);
    expect(friendRequestUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "PENDING"
        }),
        data: {
          status: "ACCEPTED"
        }
      })
    );
    expect(createNotificationSafelyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: otherUserId,
        actorId: viewerId,
        type: "FRIEND_REQUEST_ACCEPTED",
        friendRequestId: requestId
      })
    );
  });

  test("re-sending after a declined request still reactivates the same pair", async () => {
    userFindUniqueMock.mockResolvedValue({
      id: otherUserId,
      username: "jordan"
    });
    friendRequestUpsertMock.mockResolvedValue({
      id: requestId,
      toUser: {
        id: otherUserId,
        name: "Jordan",
        username: "jordan",
        avatarUrl: null
      }
    });

    const { POST } = await import("@/app/api/friends/request/route");
    const response = await POST(
      new Request("http://localhost/api/friends/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "jordan" })
      })
    );

    expect(response.status).toBe(201);
    expect(friendRequestUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          fromUserId_toUserId: {
            fromUserId: viewerId,
            toUserId: otherUserId
          }
        },
        update: { status: "PENDING" }
      })
    );
  });
});
