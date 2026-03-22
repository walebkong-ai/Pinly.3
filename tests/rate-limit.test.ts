import { afterEach, describe, expect, test, vi } from "vitest";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("rate limit enforcement", () => {
  test("uses the in-memory backend in tests and blocks after the configured limit", async () => {
    const request = new Request("http://pinly.test/api/test", {
      headers: {
        "x-forwarded-for": "203.0.113.5"
      }
    });
    const { enforceRateLimit, resetRateLimitBuckets } = await import("@/lib/rate-limit");

    resetRateLimitBuckets();

    expect(
      await enforceRateLimit({
        scope: "memory-test",
        request,
        limit: 1,
        windowMs: 60_000
      })
    ).toBeNull();

    const blockedResponse = await enforceRateLimit({
      scope: "memory-test",
      request,
      limit: 1,
      windowMs: 60_000
    });

    expect(blockedResponse?.status).toBe(429);
    expect(blockedResponse?.headers.get("Retry-After")).toBe("60");
  });

  test("uses the database backend when configured and returns 429 without inserting another event", async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "production",
      RATE_LIMIT_DRIVER: "database"
    };

    const count = vi.fn().mockResolvedValue(1);
    const findFirst = vi.fn().mockResolvedValue({
      createdAt: new Date(Date.now() - 2_000)
    });
    const create = vi.fn();
    const deleteMany = vi.fn().mockResolvedValue({ count: 0 });

    vi.spyOn(Math, "random").mockReturnValue(1);
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        rateLimitEvent: {
          count,
          findFirst,
          create,
          deleteMany
        }
      }
    }));
    vi.doMock("@/lib/prisma-errors", () => ({
      isPrismaSchemaNotReadyError: () => false
    }));

    const { enforceRateLimit } = await import("@/lib/rate-limit");
    const blockedResponse = await enforceRateLimit({
      scope: "database-test",
      request: new Request("http://pinly.test/api/test"),
      limit: 1,
      windowMs: 60_000
    });

    expect(blockedResponse?.status).toBe(429);
    expect(create).not.toHaveBeenCalled();
  });

  test("returns 503 instead of silently weakening protection when the database backend fails in production", async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "production",
      RATE_LIMIT_DRIVER: "database"
    };

    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(Math, "random").mockReturnValue(1);
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        rateLimitEvent: {
          count: vi.fn().mockRejectedValue(new Error("database offline")),
          findFirst: vi.fn(),
          create: vi.fn(),
          deleteMany: vi.fn()
        }
      }
    }));
    vi.doMock("@/lib/prisma-errors", () => ({
      isPrismaSchemaNotReadyError: () => false
    }));

    const { enforceRateLimit } = await import("@/lib/rate-limit");
    const unavailableResponse = await enforceRateLimit({
      scope: "database-failure",
      request: new Request("http://pinly.test/api/test"),
      limit: 3,
      windowMs: 60_000
    });

    expect(unavailableResponse?.status).toBe(503);
    expect(unavailableResponse?.headers.get("Retry-After")).toBe("60");
  });
});
