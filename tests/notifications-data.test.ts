import { beforeEach, describe, expect, test, vi } from "vitest";

const { notificationFindManyMock } = vi.hoisted(() => ({
  notificationFindManyMock: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      findMany: notificationFindManyMock
    }
  }
}));

import { getNotifications } from "@/lib/data";

describe("getNotifications", () => {
  beforeEach(() => {
    notificationFindManyMock.mockReset();
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
});
