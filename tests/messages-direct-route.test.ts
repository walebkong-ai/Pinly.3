import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const getFriendIdsMock = vi.fn();
const groupFindUniqueMock = vi.fn();
const userFindManyMock = vi.fn();
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
      findUnique: groupFindUniqueMock,
      create: groupCreateMock
    },
    user: {
      findMany: userFindManyMock
    }
  }
}));

describe("messages direct route", () => {
  const viewerId = "ck12345678901234567890123";
  const friendId = "ck99999999999999999999999";

  beforeEach(() => {
    authMock.mockReset();
    getFriendIdsMock.mockReset();
    groupFindUniqueMock.mockReset();
    userFindManyMock.mockReset();
    groupCreateMock.mockReset();

    authMock.mockResolvedValue({
      user: {
        id: viewerId
      }
    });
  });

  test("POST returns an existing direct conversation for a friend pair", async () => {
    getFriendIdsMock.mockResolvedValue([friendId]);
    groupFindUniqueMock.mockResolvedValue({ id: "group_existing_1" });

    const { POST } = await import("@/app/api/messages/direct/route");
    const response = await POST(
      new Request("http://localhost/api/messages/direct", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ friendId })
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      groupId: "group_existing_1",
      created: false
    });
    expect(groupCreateMock).not.toHaveBeenCalled();
  });

  test("POST creates a new direct conversation for a friend", async () => {
    getFriendIdsMock.mockResolvedValue([friendId]);
    groupFindUniqueMock.mockResolvedValue(null);
    userFindManyMock.mockResolvedValue([
      { id: viewerId, name: "Avery" },
      { id: friendId, name: "Jordan" }
    ]);
    groupCreateMock.mockResolvedValue({ id: "group_direct_1" });

    const { POST } = await import("@/app/api/messages/direct/route");
    const response = await POST(
      new Request("http://localhost/api/messages/direct", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ friendId })
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      groupId: "group_direct_1",
      created: true
    });
    expect(groupCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
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
  });

  test("POST rejects non-friend direct messaging", async () => {
    getFriendIdsMock.mockResolvedValue([]);

    const { POST } = await import("@/app/api/messages/direct/route");
    const response = await POST(
      new Request("http://localhost/api/messages/direct", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ friendId })
      })
    );

    expect(response.status).toBe(403);
    expect(groupCreateMock).not.toHaveBeenCalled();
  });
});
