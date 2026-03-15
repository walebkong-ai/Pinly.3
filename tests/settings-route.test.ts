import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const findUniqueMock = vi.fn();
const upsertMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userSettings: {
      findUnique: findUniqueMock,
      upsert: upsertMock
    }
  }
}));

describe("settings route", () => {
  beforeEach(() => {
    authMock.mockReset();
    findUniqueMock.mockReset();
    upsertMock.mockReset();
    authMock.mockResolvedValue({ user: { id: "user_1" } });
  });

  test("GET returns sensible defaults when settings do not exist yet", async () => {
    findUniqueMock.mockResolvedValue(null);

    const { GET } = await import("@/app/api/settings/route");
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      showLikeCounts: true,
      showCommentCounts: true,
      commentsEnabled: true
    });
  });

  test("PUT persists commentsEnabled alongside existing settings", async () => {
    upsertMock.mockResolvedValue({
      showLikeCounts: false,
      showCommentCounts: true,
      commentsEnabled: false
    });

    const { PUT } = await import("@/app/api/settings/route");
    const response = await PUT(
      new Request("http://localhost/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          showLikeCounts: false,
          commentsEnabled: false
        })
      })
    );

    expect(response.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          userId: "user_1",
          showLikeCounts: false,
          commentsEnabled: false
        }),
        update: expect.objectContaining({
          showLikeCounts: false,
          commentsEnabled: false
        })
      })
    );

    const payload = await response.json();
    expect(payload).toMatchObject({
      showLikeCounts: false,
      commentsEnabled: false
    });
  });
});
