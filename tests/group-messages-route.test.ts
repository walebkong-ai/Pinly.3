import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const getGroupConversationMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/data", () => ({
  getGroupConversation: getGroupConversationMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {}
}));

describe("group messages route", () => {
  beforeEach(() => {
    authMock.mockReset();
    getGroupConversationMock.mockReset();
  });

  test("GET rejects unauthenticated access", async () => {
    authMock.mockResolvedValue(null);

    const { GET } = await import("@/app/api/groups/[id]/messages/route");
    const response = await GET(new Request("http://localhost/api/groups/group_1/messages"), {
      params: Promise.resolve({ id: "group_1" })
    });

    expect(response.status).toBe(401);
  });

  test("GET returns 404 when the conversation does not exist", async () => {
    authMock.mockResolvedValue({ user: { id: "viewer_1" } });
    getGroupConversationMock.mockResolvedValue({ status: "not_found" });

    const { GET } = await import("@/app/api/groups/[id]/messages/route");
    const response = await GET(new Request("http://localhost/api/groups/group_1/messages"), {
      params: Promise.resolve({ id: "group_1" })
    });

    expect(response.status).toBe(404);
  });

  test("GET returns 403 when the viewer is not a member", async () => {
    authMock.mockResolvedValue({ user: { id: "viewer_1" } });
    getGroupConversationMock.mockResolvedValue({ status: "forbidden" });

    const { GET } = await import("@/app/api/groups/[id]/messages/route");
    const response = await GET(new Request("http://localhost/api/groups/group_1/messages"), {
      params: Promise.resolve({ id: "group_1" })
    });

    expect(response.status).toBe(403);
  });

  test("GET returns hydrated messages when the viewer can access the conversation", async () => {
    authMock.mockResolvedValue({ user: { id: "viewer_1" } });
    getGroupConversationMock.mockResolvedValue({
      status: "ok",
      group: {
        id: "group_1",
        name: "Trip Crew",
        isDirect: false,
        members: []
      },
      messages: [
        {
          id: "message_1",
          content: "[SHARED_POST]:post_1",
          createdAt: "2026-03-16T12:00:00.000Z",
          user: {
            id: "friend_1",
            name: "Maya",
            username: "maya",
            avatarUrl: null
          },
          sharedPost: {
            id: "post_1",
            caption: "Sunset in Lisbon",
            placeName: "Miradouro",
            city: "Lisbon",
            country: "Portugal",
            thumbnailUrl: "/uploads/post_1.jpg"
          }
        }
      ]
    });

    const { GET } = await import("@/app/api/groups/[id]/messages/route");
    const response = await GET(new Request("http://localhost/api/groups/group_1/messages"), {
      params: Promise.resolve({ id: "group_1" })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      messages: [
        expect.objectContaining({
          id: "message_1",
          sharedPost: expect.objectContaining({
            id: "post_1"
          })
        })
      ]
    });
    expect(getGroupConversationMock).toHaveBeenCalledWith("viewer_1", "group_1");
  });
});
