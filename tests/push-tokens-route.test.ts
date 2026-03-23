import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const pushTokenUpsertMock = vi.fn();
const pushTokenDeleteManyMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    pushToken: {
      upsert: pushTokenUpsertMock,
      deleteMany: pushTokenDeleteManyMock
    }
  }
}));

describe("push tokens route", () => {
  beforeEach(() => {
    authMock.mockReset();
    pushTokenUpsertMock.mockReset();
    pushTokenDeleteManyMock.mockReset();

    authMock.mockResolvedValue({
      user: {
        id: "user_1"
      }
    });
    pushTokenUpsertMock.mockResolvedValue({
      token: "token-value-12345678901234567890",
      platform: "ios",
      userId: "user_1"
    });
    pushTokenDeleteManyMock.mockResolvedValue({ count: 1 });
  });

  test("stores a push token for the signed-in user", async () => {
    const { POST } = await import("@/app/api/push-tokens/route");
    const response = await POST(
      new Request("http://localhost/api/push-tokens", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: "token-value-12345678901234567890",
          platform: "ios"
        })
      })
    );

    expect(response.status).toBe(200);
    expect(pushTokenUpsertMock).toHaveBeenCalledWith({
      where: {
        token: "token-value-12345678901234567890"
      },
      create: {
        token: "token-value-12345678901234567890",
        platform: "ios",
        userId: "user_1"
      },
      update: {
        platform: "ios",
        userId: "user_1"
      },
      select: {
        token: true,
        platform: true,
        userId: true
      }
    });
  });

  test("rejects unauthenticated requests", async () => {
    authMock.mockResolvedValue(null);

    const { POST } = await import("@/app/api/push-tokens/route");
    const response = await POST(
      new Request("http://localhost/api/push-tokens", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: "token-value-12345678901234567890",
          platform: "android"
        })
      })
    );

    expect(response.status).toBe(401);
    expect(pushTokenUpsertMock).not.toHaveBeenCalled();
  });

  test("deletes the signed-in user's token", async () => {
    const { DELETE } = await import("@/app/api/push-tokens/route");
    const response = await DELETE(
      new Request("http://localhost/api/push-tokens?token=token-value-12345678901234567890", {
        method: "DELETE"
      })
    );

    expect(response.status).toBe(200);
    expect(pushTokenDeleteManyMock).toHaveBeenCalledWith({
      where: {
        token: "token-value-12345678901234567890",
        userId: "user_1"
      }
    });
  });
});
