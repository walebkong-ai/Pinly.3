import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const getProfileDataMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/data", () => ({
  getProfileData: getProfileDataMock
}));

describe("profile public route", () => {
  beforeEach(() => {
    authMock.mockReset();
    getProfileDataMock.mockReset();
    authMock.mockResolvedValue({
      user: {
        id: "viewer_1"
      }
    });
  });

  test("returns visible profile data for the viewer", async () => {
    getProfileDataMock.mockResolvedValue({
      user: {
        id: "friend_1",
        username: "maya"
      },
      posts: []
    });

    const { GET } = await import("@/app/api/profile/[username]/route");
    const response = await GET(new Request("http://localhost/api/profile/maya"), {
      params: Promise.resolve({ username: "Maya" })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      user: {
        id: "friend_1",
        username: "maya"
      },
      posts: []
    });
    expect(getProfileDataMock).toHaveBeenCalledWith("maya", "viewer_1");
  });

  test("returns 404 when the viewer should not see the profile shell", async () => {
    getProfileDataMock.mockResolvedValue(null);

    const { GET } = await import("@/app/api/profile/[username]/route");
    const response = await GET(new Request("http://localhost/api/profile/hidden"), {
      params: Promise.resolve({ username: "hidden" })
    });

    expect(response.status).toBe(404);
  });
});
