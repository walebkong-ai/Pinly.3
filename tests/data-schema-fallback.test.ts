import { beforeEach, describe, expect, test, vi } from "vitest";

const { friendshipFindManyMock, blockFindManyMock } = vi.hoisted(() => ({
  friendshipFindManyMock: vi.fn(),
  blockFindManyMock: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    friendship: {
      findMany: friendshipFindManyMock
    },
    block: {
      findMany: blockFindManyMock
    }
  }
}));

import { getFriendIds, getVisibleUserIds } from "@/lib/data";

describe("data schema fallback", () => {
  const viewerId = "viewer_1";
  const friendId = "friend_1";
  const friendTwoId = "friend_2";

  beforeEach(() => {
    friendshipFindManyMock.mockReset();
    blockFindManyMock.mockReset();
  });

  test("keeps visible ids when the block table is not ready yet", async () => {
    friendshipFindManyMock.mockResolvedValue([
      { userAId: viewerId, userBId: friendId },
      { userAId: friendTwoId, userBId: viewerId }
    ]);
    blockFindManyMock.mockRejectedValue({ code: "P2021" });

    await expect(getVisibleUserIds(viewerId)).resolves.toEqual([viewerId, friendId, friendTwoId]);
  });

  test("keeps friend ids when the block table is not ready yet", async () => {
    friendshipFindManyMock.mockResolvedValue([
      { userAId: viewerId, userBId: friendId },
      { userAId: friendTwoId, userBId: viewerId }
    ]);
    blockFindManyMock.mockRejectedValue({ code: "P2022" });

    await expect(getFriendIds(viewerId)).resolves.toEqual([friendId, friendTwoId]);
  });

  test("falls back to the viewer only when the friendship table is not ready yet", async () => {
    friendshipFindManyMock.mockRejectedValue({ code: "P2021" });
    blockFindManyMock.mockResolvedValue([]);

    await expect(getVisibleUserIds(viewerId)).resolves.toEqual([viewerId]);
  });

  test("falls back to no friends when the friendship table is not ready yet", async () => {
    friendshipFindManyMock.mockRejectedValue({ code: "P2022" });
    blockFindManyMock.mockResolvedValue([]);

    await expect(getFriendIds(viewerId)).resolves.toEqual([]);
  });
});
