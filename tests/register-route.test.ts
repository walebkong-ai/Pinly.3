import { beforeEach, describe, expect, test, vi } from "vitest";

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
          avatarUrl: ""
        })
      })
    );

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.user.email).toBe("avery@pinly.demo");
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
          avatarUrl: ""
        })
      })
    );

    expect(response.status).toBe(409);
  });
});
