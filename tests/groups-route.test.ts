import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const getFriendIdsMock = vi.fn();
const getMessageGroupsMock = vi.fn();
const groupCreateMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/data", () => ({
  getFriendIds: getFriendIdsMock,
  getMessageGroups: getMessageGroupsMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    group: {
      create: groupCreateMock
    }
  }
}));

describe("groups route", () => {
  const viewerId = "ck12345678901234567890123";
  const friendId = "ck99999999999999999999999";

  beforeEach(() => {
    authMock.mockReset();
    getFriendIdsMock.mockReset();
    getMessageGroupsMock.mockReset();
    groupCreateMock.mockReset();

    authMock.mockResolvedValue({
      user: {
        id: viewerId
      }
    });
  });

  test("POST creates a group when all selected members are friends", async () => {
    getFriendIdsMock.mockResolvedValue([friendId]);
    groupCreateMock.mockResolvedValue({ id: "group_1" });

    const { POST } = await import("@/app/api/groups/route");
    const response = await POST(
      new Request("http://localhost/api/groups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Trip crew",
          memberIds: [friendId]
        })
      })
    );

    expect(response.status).toBe(200);
    expect(groupCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          members: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({ userId: viewerId }),
              expect.objectContaining({ userId: friendId })
            ])
          })
        })
      })
    );
  });

  test("POST rejects non-friends when creating a group", async () => {
    getFriendIdsMock.mockResolvedValue([]);

    const { POST } = await import("@/app/api/groups/route");
    const response = await POST(
      new Request("http://localhost/api/groups", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Trip crew",
          memberIds: [friendId]
        })
      })
    );

    expect(response.status).toBe(403);
    expect(groupCreateMock).not.toHaveBeenCalled();
  });

  test("GET returns only visible message groups", async () => {
    getMessageGroupsMock.mockResolvedValue([
      {
        id: "group_visible_1",
        name: "Trip crew",
        isDirect: false,
        updatedAt: new Date("2026-03-22T12:00:00.000Z"),
        members: [],
        _count: {
          members: 2,
          messages: 5
        }
      }
    ]);

    const { GET } = await import("@/app/api/groups/route");
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      groups: [
        expect.objectContaining({
          id: "group_visible_1"
        })
      ]
    });
    expect(getMessageGroupsMock).toHaveBeenCalledWith(viewerId);
  });
});
