import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const unstableUpdateMock = vi.fn();
const findUniqueMock = vi.fn();
const findFirstMock = vi.fn();
const updateMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock,
  unstable_update: unstableUpdateMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: findUniqueMock,
      findFirst: findFirstMock,
      update: updateMock
    }
  }
}));

describe("profile route", () => {
  beforeEach(() => {
    authMock.mockReset();
    unstableUpdateMock.mockReset();
    findUniqueMock.mockReset();
    findFirstMock.mockReset();
    updateMock.mockReset();

    authMock.mockResolvedValue({
      user: {
        id: "user_1",
        username: "stale_session_username"
      }
    });
    findUniqueMock.mockResolvedValue({
      id: "user_1",
      username: "avery",
      avatarUrl: null
    });
    findFirstMock.mockResolvedValue(null);
    updateMock.mockResolvedValue({
      id: "user_1",
      username: "avery",
      avatarUrl: null
    });
    unstableUpdateMock.mockResolvedValue(null);
  });

  test("saves an available username after trimming and lowercasing it", async () => {
    updateMock.mockResolvedValue({
      id: "user_1",
      username: "new_name",
      avatarUrl: "https://cdn.pinly.dev/avatar.jpg"
    });

    const { PATCH } = await import("@/app/api/profile/route");
    const response = await PATCH(
      new Request("http://localhost/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: "  New_Name  ",
          avatarUrl: "https://cdn.pinly.dev/avatar.jpg"
        })
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      user: {
        username: "new_name",
        avatarUrl: "https://cdn.pinly.dev/avatar.jpg"
      }
    });
    expect(findFirstMock).toHaveBeenCalledWith({
      where: {
        username: "new_name",
        id: { not: "user_1" }
      },
      select: { id: true }
    });
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: {
        username: "new_name",
        avatarUrl: "https://cdn.pinly.dev/avatar.jpg"
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true
      }
    });
    expect(unstableUpdateMock).toHaveBeenCalledWith({
      user: {
        username: "new_name",
        avatarUrl: "https://cdn.pinly.dev/avatar.jpg"
      }
    });
  });

  test("does not flag the current user's own username as taken even with a stale session username", async () => {
    const { PATCH } = await import("@/app/api/profile/route");
    const response = await PATCH(
      new Request("http://localhost/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: "  AVERY  "
        })
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true });
    expect(findFirstMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(unstableUpdateMock).not.toHaveBeenCalled();
  });

  test("blocks usernames that belong to another account", async () => {
    findFirstMock.mockResolvedValue({ id: "user_2" });

    const { PATCH } = await import("@/app/api/profile/route");
    const response = await PATCH(
      new Request("http://localhost/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: "maya"
        })
      })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "Username is already taken"
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  test("validates the normalized username format", async () => {
    const { PATCH } = await import("@/app/api/profile/route");
    const response = await PATCH(
      new Request("http://localhost/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: "  ab  "
        })
      })
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: "Validation failed",
      issues: {
        fieldErrors: {
          username: ["Use 3-20 lowercase letters, numbers, underscores, or hyphens"]
        }
      }
    });
    expect(findFirstMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  test("returns a taken error when the database unique constraint wins a race", async () => {
    updateMock.mockRejectedValue({ code: "P2002" });

    const { PATCH } = await import("@/app/api/profile/route");
    const response = await PATCH(
      new Request("http://localhost/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: "noah"
        })
      })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "Username is already taken"
    });
  });
});
