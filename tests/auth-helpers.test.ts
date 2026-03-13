import { hash } from "bcryptjs";
import { describe, expect, test, vi } from "vitest";
import { authorizeCredentials, createUniqueUsername, ensureGoogleUser, normalizeUsernameSeed } from "@/lib/auth-helpers";

describe("auth helpers", () => {
  test("credentials authorize returns user when password is valid", async () => {
    const passwordHash = await hash("password123", 10);
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: "user_1",
          name: "Avery Chen",
          username: "avery",
          email: "avery@pinly.demo",
          passwordHash,
          avatarUrl: null
        })
      }
    };

    const user = await authorizeCredentials(prisma as never, {
      email: "avery@pinly.demo",
      password: "password123"
    });

    expect(user?.id).toBe("user_1");
    expect(user?.username).toBe("avery");
  });

  test("credentials authorize returns null for invalid password", async () => {
    const passwordHash = await hash("password123", 10);
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: "user_1",
          name: "Avery Chen",
          username: "avery",
          email: "avery@pinly.demo",
          passwordHash,
          avatarUrl: null
        })
      }
    };

    const user = await authorizeCredentials(prisma as never, {
      email: "avery@pinly.demo",
      password: "not-right"
    });

    expect(user).toBeNull();
  });

  test("normalizes usernames from provider seeds", () => {
    expect(normalizeUsernameSeed("Alex Rivera")).toBe("alex_rivera");
    expect(normalizeUsernameSeed("jo@pinly.demo")).toBe("jo_pinly");
  });

  test("creates unique usernames when base is taken", async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockImplementation(({ where }: any) => {
          if (where.username === "alex") {
            return Promise.resolve({ id: "existing" });
          }

          return Promise.resolve(null);
        })
      }
    };

    const username = await createUniqueUsername(prisma as never, "Alex");

    expect(username).toBe("alex1");
  });

  test("google sign in creates a user when email does not exist", async () => {
    const prisma = {
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null),
        create: vi.fn().mockImplementation(({ data }: any) =>
          Promise.resolve({
            id: "google_1",
            name: data.name,
            username: data.username,
            email: data.email,
            passwordHash: data.passwordHash,
            avatarUrl: data.avatarUrl
          })
        ),
        update: vi.fn()
      }
    };

    const user = await ensureGoogleUser(prisma as never, {
      email: "newgoogle@pinly.demo",
      name: "New Google",
      avatarUrl: "https://example.com/avatar.jpg"
    });

    expect(user?.email).toBe("newgoogle@pinly.demo");
    expect(user?.username.startsWith("new_google")).toBe(true);
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
  });
});
