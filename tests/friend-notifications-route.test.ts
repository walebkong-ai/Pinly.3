import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const userFindUniqueMock = vi.fn();
const friendshipFindUniqueMock = vi.fn();
const friendRequestFindFirstMock = vi.fn();
const friendRequestCreateMock = vi.fn();
const friendRequestFindUniqueMock = vi.fn();
const friendRequestUpdateMock = vi.fn();
const friendshipCreateMock = vi.fn();
const createNotificationMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: userFindUniqueMock
    },
    friendship: {
      findUnique: friendshipFindUniqueMock,
      create: friendshipCreateMock
    },
    friendRequest: {
      findFirst: friendRequestFindFirstMock,
      create: friendRequestCreateMock,
      findUnique: friendRequestFindUniqueMock,
      update: friendRequestUpdateMock
    }
  }
}));

vi.mock("@/lib/notifications", () => ({
  createNotification: createNotificationMock
}));

describe("friend request notification routes", () => {
  const viewerId = "ck12345678901234567890123";
  const otherUserId = "ck99999999999999999999999";
  const requestId = "ck77777777777777777777777";

  beforeEach(() => {
    authMock.mockReset();
    userFindUniqueMock.mockReset();
    friendshipFindUniqueMock.mockReset();
    friendRequestFindFirstMock.mockReset();
    friendRequestCreateMock.mockReset();
    friendRequestFindUniqueMock.mockReset();
    friendRequestUpdateMock.mockReset();
    friendshipCreateMock.mockReset();
    createNotificationMock.mockReset();

    authMock.mockResolvedValue({
      user: {
        id: viewerId
      }
    });
    friendshipFindUniqueMock.mockResolvedValue(null);
    friendRequestFindFirstMock.mockResolvedValue(null);
  });

  test("sending a friend request creates a received notification", async () => {
    userFindUniqueMock.mockResolvedValue({
      id: otherUserId,
      username: "jordan"
    });
    friendRequestCreateMock.mockResolvedValue({
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
    expect(createNotificationMock).toHaveBeenCalledWith(
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
    friendRequestUpdateMock.mockResolvedValue({ id: requestId, status: "ACCEPTED" });
    friendshipCreateMock.mockResolvedValue({ id: "friendship_1" });

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
    expect(createNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: otherUserId,
        actorId: viewerId,
        type: "FRIEND_REQUEST_ACCEPTED",
        friendRequestId: requestId
      })
    );
  });
});
