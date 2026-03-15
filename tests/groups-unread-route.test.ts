import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const groupMemberFindManyMock = vi.fn();
const groupMessageCountMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    groupMember: {
      findMany: groupMemberFindManyMock
    },
    groupMessage: {
      count: groupMessageCountMock
    }
  }
}));

describe("groups unread route", () => {
  const viewerId = "viewer_1";

  beforeEach(() => {
    authMock.mockReset();
    groupMemberFindManyMock.mockReset();
    groupMessageCountMock.mockReset();

    authMock.mockResolvedValue({
      user: {
        id: viewerId
      }
    });
  });

  test("counts only unread messages from other people", async () => {
    groupMemberFindManyMock.mockResolvedValue([
      {
        groupId: "group_1",
        lastReadAt: new Date("2026-03-15T10:00:00.000Z")
      },
      {
        groupId: "group_2",
        lastReadAt: new Date("2026-03-15T11:00:00.000Z")
      }
    ]);
    groupMessageCountMock
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);

    const { GET } = await import("@/app/api/groups/unread/route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ unreadCount: 3 });
    expect(groupMessageCountMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          groupId: "group_1",
          userId: {
            not: viewerId
          }
        })
      })
    );
  });
});
