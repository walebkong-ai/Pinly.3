import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  AccountDeletionNotFoundError,
  DemoAccountDeletionNotAllowedError,
  collectAccountDeletionMediaUrls,
  deleteAccount,
  planAccountGroupCleanup
} from "@/lib/account-deletion";
import { TEST_AVATAR_URL, TEST_IMAGE_URL, TEST_THUMBNAIL_URL } from "@/tests/fixtures/media";

describe("account deletion helpers", () => {
  test("plans direct chat deletion, empty group removal, and owner transfer", () => {
    const joinedAt = new Date("2026-03-22T10:00:00.000Z");
    const plan = planAccountGroupCleanup("user_1", [
      {
        groupId: "direct_1",
        role: "OWNER",
        group: {
          id: "direct_1",
          isDirect: true,
          members: [
            { userId: "user_1", role: "OWNER", joinedAt },
            { userId: "user_2", role: "MEMBER", joinedAt: new Date("2026-03-22T10:05:00.000Z") }
          ]
        }
      },
      {
        groupId: "group_transfer",
        role: "OWNER",
        group: {
          id: "group_transfer",
          isDirect: false,
          members: [
            { userId: "user_1", role: "OWNER", joinedAt },
            { userId: "user_3", role: "MEMBER", joinedAt: new Date("2026-03-22T10:01:00.000Z") },
            { userId: "user_4", role: "MEMBER", joinedAt: new Date("2026-03-22T10:02:00.000Z") }
          ]
        }
      },
      {
        groupId: "group_delete",
        role: "OWNER",
        group: {
          id: "group_delete",
          isDirect: false,
          members: [{ userId: "user_1", role: "OWNER", joinedAt }]
        }
      }
    ]);

    expect(plan.directGroupIds).toEqual(["direct_1"]);
    expect(plan.groupsToDelete).toEqual(["group_delete"]);
    expect(plan.ownershipTransfers).toEqual([
      {
        groupId: "group_transfer",
        nextOwnerUserId: "user_3"
      }
    ]);
  });

  test("collects only trusted media urls from the account snapshot", () => {
    const urls = collectAccountDeletionMediaUrls({
      avatarUrl: TEST_AVATAR_URL,
      posts: [
        {
          mediaUrl: TEST_IMAGE_URL,
          thumbnailUrl: TEST_THUMBNAIL_URL
        },
        {
          mediaUrl: "https://picsum.photos/seed/pinly/1200/900",
          thumbnailUrl: null
        }
      ]
    });

    expect(urls).toEqual([
      TEST_AVATAR_URL,
      TEST_IMAGE_URL,
      TEST_THUMBNAIL_URL
    ]);
  });
});

describe("deleteAccount", () => {
  const countMock = vi.fn();
  const groupDeleteManyMock = vi.fn();
  const groupMemberUpdateMock = vi.fn();
  const passwordResetDeleteManyMock = vi.fn();
  const userDeleteMock = vi.fn();
  const findUniqueMock = vi.fn();
  const transactionMock = vi.fn();
  const deleteMediaObjectsMock = vi.fn();

  beforeEach(() => {
    countMock.mockReset();
    groupDeleteManyMock.mockReset();
    groupMemberUpdateMock.mockReset();
    passwordResetDeleteManyMock.mockReset();
    userDeleteMock.mockReset();
    findUniqueMock.mockReset();
    transactionMock.mockReset();
    deleteMediaObjectsMock.mockReset();
  });

  test("deletes the account and cleans related records", async () => {
    transactionMock.mockImplementation(async (callback: (tx: any) => Promise<unknown>) =>
      callback({
        user: {
          findUnique: findUniqueMock,
          delete: userDeleteMock
        },
        passwordResetToken: {
          count: countMock,
          deleteMany: passwordResetDeleteManyMock
        },
        group: {
          deleteMany: groupDeleteManyMock
        },
        groupMember: {
          update: groupMemberUpdateMock
        }
      })
    );

    findUniqueMock.mockResolvedValue({
      id: "user_1",
      email: "avery@example.com",
      username: "avery",
      avatarUrl: TEST_AVATAR_URL,
      posts: [
        {
          mediaUrl: TEST_IMAGE_URL,
          thumbnailUrl: TEST_THUMBNAIL_URL
        }
      ],
      groupMembers: [
        {
          groupId: "direct_1",
          role: "OWNER",
          group: {
            id: "direct_1",
            isDirect: true,
            members: [
              { userId: "user_1", role: "OWNER", joinedAt: new Date("2026-03-22T10:00:00.000Z") },
              { userId: "user_2", role: "MEMBER", joinedAt: new Date("2026-03-22T10:01:00.000Z") }
            ]
          }
        },
        {
          groupId: "group_1",
          role: "OWNER",
          group: {
            id: "group_1",
            isDirect: false,
            members: [
              { userId: "user_1", role: "OWNER", joinedAt: new Date("2026-03-22T10:00:00.000Z") },
              { userId: "user_3", role: "MEMBER", joinedAt: new Date("2026-03-22T10:02:00.000Z") }
            ]
          }
        }
      ],
      _count: {
        posts: 1,
        postCollections: 2,
        wantToGoPlaces: 3,
        comments: 4,
        likes: 5,
        savedPosts: 6,
        notifications: 7,
        actorNotifications: 8,
        sentRequests: 1,
        receivedRequests: 2,
        friendshipsA: 3,
        friendshipsB: 4,
        groupMessages: 5,
        groupMembers: 2,
        inviteLinks: 1,
        blocksGiven: 1,
        blocksReceived: 1,
        reportsGiven: 2,
        reportsReceived: 2
      }
    });
    countMock.mockResolvedValue(2);
    groupDeleteManyMock.mockResolvedValue({ count: 1 });
    groupMemberUpdateMock.mockResolvedValue({});
    passwordResetDeleteManyMock.mockResolvedValue({ count: 2 });
    userDeleteMock.mockResolvedValue({});

    const summary = await deleteAccount("user_1", {
      db: {
        $transaction: transactionMock
      } as never,
      deleteMediaObjects: deleteMediaObjectsMock
    });

    expect(groupDeleteManyMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          id: { in: ["direct_1"] }
        }
      })
    );
    expect(groupMemberUpdateMock).toHaveBeenCalledWith({
      where: {
        groupId_userId: {
          groupId: "group_1",
          userId: "user_3"
        }
      },
      data: {
        role: "OWNER"
      }
    });
    expect(passwordResetDeleteManyMock).toHaveBeenCalledWith({
      where: { email: "avery@example.com" }
    });
    expect(userDeleteMock).toHaveBeenCalledWith({
      where: { id: "user_1" }
    });
    expect(deleteMediaObjectsMock).toHaveBeenCalledWith([TEST_AVATAR_URL, TEST_IMAGE_URL, TEST_THUMBNAIL_URL]);
    expect(summary).toMatchObject({
      username: "avery",
      postsDeleted: 1,
      directConversationsDeleted: 1,
      groupOwnershipTransfers: 1,
      passwordResetTokensDeleted: 2,
      deletedMediaObjectCount: 3,
      mediaDeletionFailed: false
    });
  });

  test("rejects missing accounts", async () => {
    transactionMock.mockImplementation(async (callback: (tx: any) => Promise<unknown>) =>
      callback({
        user: {
          findUnique: findUniqueMock
        }
      })
    );
    findUniqueMock.mockResolvedValue(null);

    await expect(
      deleteAccount("missing_user", {
        db: {
          $transaction: transactionMock
        } as never,
        deleteMediaObjects: deleteMediaObjectsMock
      })
    ).rejects.toBeInstanceOf(AccountDeletionNotFoundError);
  });

  test("blocks reserved demo accounts", async () => {
    transactionMock.mockImplementation(async (callback: (tx: any) => Promise<unknown>) =>
      callback({
        user: {
          findUnique: findUniqueMock
        }
      })
    );
    findUniqueMock.mockResolvedValue({
      id: "user_demo",
      email: "avery@pinly.demo",
      username: "avery",
      avatarUrl: null,
      posts: [],
      groupMembers: [],
      _count: {
        posts: 0,
        postCollections: 0,
        wantToGoPlaces: 0,
        comments: 0,
        likes: 0,
        savedPosts: 0,
        notifications: 0,
        actorNotifications: 0,
        sentRequests: 0,
        receivedRequests: 0,
        friendshipsA: 0,
        friendshipsB: 0,
        groupMessages: 0,
        groupMembers: 0,
        inviteLinks: 0,
        blocksGiven: 0,
        blocksReceived: 0,
        reportsGiven: 0,
        reportsReceived: 0
      }
    });

    await expect(
      deleteAccount("user_demo", {
        db: {
          $transaction: transactionMock
        } as never,
        deleteMediaObjects: deleteMediaObjectsMock
      })
    ).rejects.toBeInstanceOf(DemoAccountDeletionNotAllowedError);
  });
});
