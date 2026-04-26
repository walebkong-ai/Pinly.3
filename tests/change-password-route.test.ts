import { hash, compare } from "bcryptjs";
import { beforeEach, describe, expect, test, vi } from "vitest";

const authMock = vi.fn();
const userFindUniqueMock = vi.fn();
const userUpdateMock = vi.fn();
const passwordResetDeleteManyMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: userFindUniqueMock,
      update: userUpdateMock
    },
    passwordResetToken: {
      deleteMany: passwordResetDeleteManyMock
    }
  }
}));

describe("change password route", () => {
  beforeEach(() => {
    authMock.mockReset();
    userFindUniqueMock.mockReset();
    userUpdateMock.mockReset();
    passwordResetDeleteManyMock.mockReset();

    authMock.mockResolvedValue({ user: { id: "user_1" } });
    userUpdateMock.mockResolvedValue({ id: "user_1" });
    passwordResetDeleteManyMock.mockResolvedValue({ count: 1 });
  });

  test("updates the stored password hash and clears outstanding reset tokens", async () => {
    const currentPassword = "old-password-123";
    const newPassword = "new-password-456";

    userFindUniqueMock.mockResolvedValue({
      id: "user_1",
      email: "avery@example.com",
      passwordHash: await hash(currentPassword, 10)
    });

    const { POST } = await import("@/app/api/auth/change-password/route");
    const response = await POST(
      new Request("http://localhost/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      })
    );

    expect(response.status).toBe(200);
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: {
        passwordHash: expect.any(String)
      }
    });

    const updatedPasswordHash = userUpdateMock.mock.calls[0]?.[0]?.data?.passwordHash;
    expect(await compare(newPassword, updatedPasswordHash)).toBe(true);
    expect(passwordResetDeleteManyMock).toHaveBeenCalledWith({
      where: { email: "avery@example.com" }
    });
  });

  test("rejects requests with the wrong current password", async () => {
    userFindUniqueMock.mockResolvedValue({
      id: "user_1",
      email: "avery@example.com",
      passwordHash: await hash("actual-password-123", 10)
    });

    const { POST } = await import("@/app/api/auth/change-password/route");
    const response = await POST(
      new Request("http://localhost/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword: "wrong-password-123",
          newPassword: "new-password-456"
        })
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: "Current password is incorrect.",
      code: "CHANGE_PASSWORD_CURRENT_INCORRECT"
    });
    expect(userUpdateMock).not.toHaveBeenCalled();
    expect(passwordResetDeleteManyMock).not.toHaveBeenCalled();
  });

  test("blocks reserved demo accounts from changing the shared password", async () => {
    userFindUniqueMock.mockResolvedValue({
      id: "user_1",
      email: "avery@pinly.demo",
      passwordHash: await hash("password123", 10)
    });

    const { POST } = await import("@/app/api/auth/change-password/route");
    const response = await POST(
      new Request("http://localhost/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword: "password123",
          newPassword: "different-password-456"
        })
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: "Reserved demo passwords cannot be changed.",
      code: "CHANGE_PASSWORD_DEMO_FORBIDDEN"
    });
    expect(userUpdateMock).not.toHaveBeenCalled();
  });
});
