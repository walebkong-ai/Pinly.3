import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const deleteAccountMock = vi.fn();
const enforceRateLimitMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/account-deletion", () => ({
  deleteAccount: deleteAccountMock,
  AccountDeletionNotFoundError: class AccountDeletionNotFoundError extends Error {},
  DemoAccountDeletionNotAllowedError: class DemoAccountDeletionNotAllowedError extends Error {}
}));

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: enforceRateLimitMock
}));

describe("account delete route", () => {
  beforeEach(() => {
    authMock.mockReset();
    deleteAccountMock.mockReset();
    enforceRateLimitMock.mockReset();
    authMock.mockResolvedValue({ user: { id: "user_1" } });
    enforceRateLimitMock.mockResolvedValue(null);
  });

  test("rejects unauthenticated requests", async () => {
    authMock.mockResolvedValue(null);

    const { POST } = await import("@/app/api/account/delete/route");
    const response = await POST(
      new Request("http://localhost/api/account/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE" })
      })
    );

    expect(response.status).toBe(401);
  });

  test("requires typed confirmation", async () => {
    const { POST } = await import("@/app/api/account/delete/route");
    const response = await POST(
      new Request("http://localhost/api/account/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmation: "nope" })
      })
    );

    expect(response.status).toBe(400);
    expect(deleteAccountMock).not.toHaveBeenCalled();
  });

  test("deletes the authenticated account only", async () => {
    deleteAccountMock.mockResolvedValue({
      username: "avery",
      deletedMediaObjectCount: 3,
      mediaDeletionFailed: false
    });

    const { POST } = await import("@/app/api/account/delete/route");
    const response = await POST(
      new Request("http://localhost/api/account/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmation: " delete " })
      })
    );

    expect(response.status).toBe(200);
    expect(deleteAccountMock).toHaveBeenCalledWith("user_1");

    const payload = await response.json();
    expect(payload).toMatchObject({
      success: true,
      summary: {
        username: "avery"
      }
    });
  });
});
