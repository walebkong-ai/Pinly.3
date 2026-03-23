import { beforeEach, describe, expect, test, vi } from "vitest";

const { notificationFindManyMock, blockFindManyMock } = vi.hoisted(() => ({
  notificationFindManyMock: vi.fn(),
  blockFindManyMock: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    block: {
      findMany: blockFindManyMock
    },
    notification: {
      findMany: notificationFindManyMock
    }
  }
}));

import { getNotifications } from "@/lib/data";

describe("getNotifications", () => {
  beforeEach(() => {
    notificationFindManyMock.mockReset();
    blockFindManyMock.mockReset();
    blockFindManyMock.mockResolvedValue([]);
  });

  test("returns only unread notifications by default", async () => {
    notificationFindManyMock.mockResolvedValue([]);

    await getNotifications("viewer_1", 12);

    expect(notificationFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "viewer_1",
          readAt: null
        },
        orderBy: { createdAt: "desc" },
        take: 12
      })
    );
  });

  test("can include read notifications when requested", async () => {
    notificationFindManyMock.mockResolvedValue([]);

    await getNotifications("viewer_1", 12, { includeRead: true });

    expect(notificationFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "viewer_1"
        },
        orderBy: { createdAt: "desc" },
        take: 12
      })
    );
  });

  test("hides notifications from blocked actors", async () => {
    blockFindManyMock.mockResolvedValue([
      {
        blockerId: "viewer_1",
        blockedId: "blocked_1"
      }
    ]);
    notificationFindManyMock.mockResolvedValue([]);

    await getNotifications("viewer_1", 12);

    expect(notificationFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "viewer_1",
          readAt: null,
          actorId: {
            notIn: ["blocked_1"]
          }
        }
      })
    );
  });
});
