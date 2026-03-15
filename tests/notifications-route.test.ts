import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const countMock = vi.fn();
const updateManyMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      count: countMock,
      updateMany: updateManyMock
    }
  }
}));

describe("notifications routes", () => {
  const viewerId = "ck12345678901234567890123";

  beforeEach(() => {
    authMock.mockReset();
    countMock.mockReset();
    updateManyMock.mockReset();

    authMock.mockResolvedValue({
      user: {
        id: viewerId
      }
    });
  });

  test("GET returns unread notification count", async () => {
    countMock.mockResolvedValue(3);

    const { GET } = await import("@/app/api/notifications/unread/route");
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ unreadCount: 3 });
    expect(countMock).toHaveBeenCalledWith({
      where: {
        userId: viewerId,
        readAt: null
      }
    });
  });

  test("POST marks selected notifications as read", async () => {
    countMock.mockResolvedValue(1);
    updateManyMock.mockResolvedValue({ count: 2 });

    const { POST } = await import("@/app/api/notifications/read/route");
    const response = await POST(
      new Request("http://localhost/api/notifications/read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          notificationIds: ["ck11111111111111111111111", "ck22222222222222222222222"]
        })
      })
    );

    expect(response.status).toBe(200);
    expect(updateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: viewerId,
          id: {
            in: ["ck11111111111111111111111", "ck22222222222222222222222"]
          }
        },
        data: {
          readAt: expect.any(Date)
        }
      })
    );
    await expect(response.json()).resolves.toEqual({
      ok: true,
      unreadCount: 1
    });
  });

  test("POST marks all unread notifications as read", async () => {
    countMock.mockResolvedValue(0);
    updateManyMock.mockResolvedValue({ count: 4 });

    const { POST } = await import("@/app/api/notifications/read/route");
    const response = await POST(
      new Request("http://localhost/api/notifications/read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          markAll: true
        })
      })
    );

    expect(response.status).toBe(200);
    expect(updateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: viewerId,
          readAt: null
        },
        data: {
          readAt: expect.any(Date)
        }
      })
    );
  });
});
