import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const getFriendIdsMock = vi.fn();
const groupFindUniqueMock = vi.fn();
const createManyMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/data", () => ({
  getFriendIds: getFriendIdsMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    group: {
      findUnique: groupFindUniqueMock
    },
    groupMember: {
      createMany: createManyMock
    }
  }
}));

describe("group members route", () => {
  const viewerId = "ck12345678901234567890123";
  const friendId = "ck99999999999999999999999";

  beforeEach(() => {
    authMock.mockReset();
    getFriendIdsMock.mockReset();
    groupFindUniqueMock.mockReset();
    createManyMock.mockReset();

    authMock.mockResolvedValue({
      user: {
        id: viewerId
      }
    });
    groupFindUniqueMock.mockResolvedValue({
      id: "group_1",
      isDirect: false,
      members: [{ userId: viewerId, role: "OWNER" }]
    });
  });

  test("POST adds a friend to an existing group", async () => {
    getFriendIdsMock.mockResolvedValue([friendId]);
    createManyMock.mockResolvedValue({ count: 1 });

    const { POST } = await import("@/app/api/groups/[id]/members/route");
    const response = await POST(
      new Request("http://localhost/api/groups/group_1/members", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userIds: [friendId] })
      }),
      {
        params: Promise.resolve({ id: "group_1" })
      }
    );

    expect(response.status).toBe(200);
    expect(createManyMock).toHaveBeenCalledWith({
      data: [
        {
          groupId: "group_1",
          userId: friendId,
          role: "MEMBER"
        }
      ],
      skipDuplicates: true
    });
  });

  test("POST rejects non-friends when adding members", async () => {
    getFriendIdsMock.mockResolvedValue([]);

    const { POST } = await import("@/app/api/groups/[id]/members/route");
    const response = await POST(
      new Request("http://localhost/api/groups/group_1/members", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userIds: [friendId] })
      }),
      {
        params: Promise.resolve({ id: "group_1" })
      }
    );

    expect(response.status).toBe(403);
    expect(createManyMock).not.toHaveBeenCalled();
  });

  test("POST rejects members who are not the group owner", async () => {
    groupFindUniqueMock.mockResolvedValue({
      id: "group_1",
      isDirect: false,
      members: [{ userId: viewerId, role: "MEMBER" }]
    });
    getFriendIdsMock.mockResolvedValue([friendId]);

    const { POST } = await import("@/app/api/groups/[id]/members/route");
    const response = await POST(
      new Request("http://localhost/api/groups/group_1/members", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userIds: [friendId] })
      }),
      {
        params: Promise.resolve({ id: "group_1" })
      }
    );

    expect(response.status).toBe(403);
    expect(createManyMock).not.toHaveBeenCalled();
  });
});
