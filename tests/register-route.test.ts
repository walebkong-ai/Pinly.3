import { beforeEach, describe, expect, test, vi } from "vitest";
import { createPendingLegalConsentToken } from "@/lib/legal";

const findFirstMock = vi.fn();
const createMock = vi.fn();
const hashMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: findFirstMock,
      create: createMock
    }
  }
}));

vi.mock("bcryptjs", () => ({
  hash: hashMock
}));

describe("register route", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
    createMock.mockReset();
    hashMock.mockReset();
  });

  test("creates a user for valid request", async () => {
    hashMock.mockResolvedValue("hashed-password");
    findFirstMock.mockResolvedValue(null);
    createMock.mockResolvedValue({
      id: "user_1",
      name: "Avery Chen",
      username: "avery",
      email: "avery@pinly.demo"
    });

    const { POST } = await import("@/app/api/auth/register/route");
    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Avery Chen",
          username: "avery",
          email: "Avery@pinly.demo",
          password: "password123",
          acceptLegal: true
        })
      })
    );

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.user.email).toBe("avery@pinly.demo");
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          termsAcceptedAt: expect.any(Date),
          privacyAcceptedAt: expect.any(Date),
          termsVersion: "2026-03-22",
          privacyVersion: "2026-03-22"
        })
      })
    );
  });

  test("uses the pending legal consent cookie when it exists", async () => {
    const acceptedAt = new Date();
    const token = createPendingLegalConsentToken(acceptedAt);

    hashMock.mockResolvedValue("hashed-password");
    findFirstMock.mockResolvedValue(null);
    createMock.mockResolvedValue({
      id: "user_2",
      name: "Noah Brooks",
      username: "noah",
      email: "noah@pinly.demo"
    });

    const { POST } = await import("@/app/api/auth/register/route");
    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `pinly_legal_signup=${token}`
        },
        body: JSON.stringify({
          name: "Noah Brooks",
          username: "noah",
          email: "noah@pinly.demo",
          password: "password123",
          acceptLegal: true
        })
      })
    );

    expect(response.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          termsAcceptedAt: acceptedAt,
          privacyAcceptedAt: acceptedAt,
          termsVersion: "2026-03-22",
          privacyVersion: "2026-03-22"
        })
      })
    );
    expect(response.headers.get("set-cookie")).toContain("pinly_legal_signup=;");
  });

  test("returns conflict for duplicate user", async () => {
    findFirstMock.mockResolvedValue({
      id: "existing"
    });

    const { POST } = await import("@/app/api/auth/register/route");
    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Avery Chen",
          username: "avery",
          email: "avery@pinly.demo",
          password: "password123",
          acceptLegal: true
        })
      })
    );

    expect(response.status).toBe(409);
  });

  test("rejects requests without legal acceptance", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Avery Chen",
          username: "avery",
          email: "avery@pinly.demo",
          password: "password123",
          acceptLegal: false
        })
      })
    );

    expect(response.status).toBe(422);
    expect(createMock).not.toHaveBeenCalled();
  });
});
