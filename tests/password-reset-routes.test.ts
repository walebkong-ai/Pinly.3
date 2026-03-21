import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const userFindUniqueMock = vi.fn();
const passwordResetDeleteManyMock = vi.fn();
const passwordResetCreateMock = vi.fn();
const passwordResetFindFirstMock = vi.fn();
const userUpdateMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: userFindUniqueMock,
      update: userUpdateMock
    },
    passwordResetToken: {
      deleteMany: passwordResetDeleteManyMock,
      create: passwordResetCreateMock,
      findFirst: passwordResetFindFirstMock
    }
  }
}));

describe("password reset routes", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      AUTH_DEBUG_RESET_LINKS: "true",
      NEXTAUTH_URL: "http://localhost:3000"
    };
    userFindUniqueMock.mockReset();
    passwordResetDeleteManyMock.mockReset();
    passwordResetCreateMock.mockReset();
    passwordResetFindFirstMock.mockReset();
    userUpdateMock.mockReset();
    passwordResetDeleteManyMock.mockResolvedValue({ count: 1 });
    passwordResetCreateMock.mockResolvedValue({ id: "token_1" });
    userUpdateMock.mockResolvedValue({ id: "user_1" });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test("forgot password stores a hashed token and only previews the raw link in debug mode", async () => {
    userFindUniqueMock.mockResolvedValue({ id: "user_1", email: "avery@pinly.demo" });

    const { POST } = await import("@/app/api/auth/forgot-password/route");
    const response = await POST(
      new Request("http://localhost/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "Avery@Pinly.demo" })
      })
    );

    expect(response.status).toBe(200);

    const payload = await response.json();
    expect(payload.previewResetLink).toContain("/reset-password?token=");

    expect(passwordResetCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "avery@pinly.demo",
          token: expect.any(String)
        })
      })
    );

    const storedToken = passwordResetCreateMock.mock.calls[0]?.[0]?.data?.token;
    const previewToken = payload.previewResetLink.split("token=")[1];
    expect(storedToken).not.toBe(previewToken);
  });

  test("reset password looks up hashed tokens and clears all outstanding tokens for the email", async () => {
    passwordResetFindFirstMock.mockResolvedValue({
      id: "token_1",
      email: "avery@pinly.demo",
      token: "hashed-token-value",
      expiresAt: new Date(Date.now() + 60_000)
    });

    const { POST } = await import("@/app/api/auth/reset-password/route");
    const response = await POST(
      new Request("http://localhost/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: "raw-reset-token",
          newPassword: "new-password-123"
        })
      })
    );

    expect(response.status).toBe(200);
    expect(passwordResetFindFirstMock).toHaveBeenCalledWith({
      where: {
        OR: [{ token: expect.any(String) }, { token: "raw-reset-token" }]
      }
    });
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { email: "avery@pinly.demo" },
      data: {
        passwordHash: expect.any(String)
      }
    });
    expect(passwordResetDeleteManyMock).toHaveBeenCalledWith({
      where: { email: "avery@pinly.demo" }
    });
  });
});
