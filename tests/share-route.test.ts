import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const getVisiblePostByIdMock = vi.fn();
const getFriendIdsMock = vi.fn();
const groupMemberFindManyMock = vi.fn();
const userFindManyMock = vi.fn();
const groupUpdateManyMock = vi.fn();
const groupUpsertMock = vi.fn();
const groupMessageCreateMock = vi.fn();
const transactionMock = vi.fn();
const createNotificationSafelyMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/data", () => ({
  getVisiblePostById: getVisiblePostByIdMock,
  getFriendIds: getFriendIdsMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    groupMember: {
      findMany: groupMemberFindManyMock
    },
    user: {
      findMany: userFindManyMock
    },
    $transaction: transactionMock
  }
}));

vi.mock("@/lib/notifications", () => ({
  createNotificationSafely: createNotificationSafelyMock
}));

describe("post share route", () => {
  const viewerId = "ck12345678901234567890123";
  const friendId = "ck99999999999999999999999";

  beforeEach(() => {
    authMock.mockReset();
    getVisiblePostByIdMock.mockReset();
    getFriendIdsMock.mockReset();
    groupMemberFindManyMock.mockReset();
    userFindManyMock.mockReset();
    groupUpdateManyMock.mockReset();
    groupUpsertMock.mockReset();
    groupMessageCreateMock.mockReset();
    transactionMock.mockReset();
    createNotificationSafelyMock.mockReset();

    authMock.mockResolvedValue({
      user: {
        id: viewerId
      }
    });
    getVisiblePostByIdMock.mockResolvedValue({ id: "post_1", userId: "owner_1" });
    groupMemberFindManyMock.mockResolvedValue([]);
    transactionMock.mockImplementation(async (callback: any) =>
      callback({
        group: {
          updateMany: groupUpdateManyMock,
          upsert: groupUpsertMock
        },
        groupMessage: {
          create: groupMessageCreateMock
        }
      })
    );
  });

  test("POST creates a direct share for a friend target", async () => {
    getFriendIdsMock.mockResolvedValue([friendId]);
    userFindManyMock.mockResolvedValue([
      { id: viewerId, name: "Avery" },
      { id: friendId, name: "Jordan" }
    ]);
    groupUpsertMock.mockResolvedValue({ id: "group_direct_1" });
    groupMessageCreateMock.mockResolvedValue({ id: "message_1" });

    const { POST } = await import("@/app/api/posts/[postId]/share/route");
    const response = await POST(
      new Request("http://localhost/api/posts/post_1/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userIds: [friendId] })
      }),
      {
        params: Promise.resolve({ postId: "post_1" })
      }
    );

    expect(response.status).toBe(200);
    expect(groupUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          isDirect: true,
          members: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({ userId: viewerId }),
              expect.objectContaining({ userId: friendId })
            ])
          })
        })
      })
    );
    expect(groupMessageCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          groupId: "group_direct_1",
          userId: viewerId,
          content: "[SHARED_POST]:post_1"
        })
      })
    );
    expect(createNotificationSafelyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "owner_1",
        actorId: viewerId,
        type: "POST_SHARED",
        postId: "post_1"
      })
    );
  });

  test("POST rejects direct share to non-friends", async () => {
    getFriendIdsMock.mockResolvedValue([]);

    const { POST } = await import("@/app/api/posts/[postId]/share/route");
    const response = await POST(
      new Request("http://localhost/api/posts/post_1/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userIds: ["ck88888888888888888888888"] })
      }),
      {
        params: Promise.resolve({ postId: "post_1" })
      }
    );

    expect(response.status).toBe(403);
    expect(transactionMock).not.toHaveBeenCalled();
  });
});
