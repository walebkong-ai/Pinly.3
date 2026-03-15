import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const getFriendIdsMock = vi.fn();
const groupCreateMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/data", () => ({
  getFriendIds: getFriendIdsMock
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
});
