import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const getUnreadGroupMessageCountMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/data", () => ({
  getUnreadGroupMessageCount: getUnreadGroupMessageCountMock
}));

describe("groups unread route", () => {
  const viewerId = "viewer_1";

  beforeEach(() => {
    authMock.mockReset();
    getUnreadGroupMessageCountMock.mockReset();

    authMock.mockResolvedValue({
      user: {
        id: viewerId
      }
    });
  });

  test("counts only unread messages from other people", async () => {
    getUnreadGroupMessageCountMock.mockResolvedValue(3);

    const { GET } = await import("@/app/api/groups/unread/route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ unreadCount: 3 });
    expect(getUnreadGroupMessageCountMock).toHaveBeenCalledWith(viewerId);
  });
});
