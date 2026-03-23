import { hash } from "bcryptjs";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createLegalAcceptanceRecord } from "@/lib/legal";
import { DEFAULT_DEMO_USER_EMAIL, DEMO_PASSWORD } from "@/lib/demo-config";
import {
  authorizeCredentials,
  createUniqueUsername,
  ensureGoogleUser,
  LegalAcceptanceRequiredError,
  normalizeUsernameSeed
} from "@/lib/auth-helpers";

const { ensureDemoDatasetMock } = vi.hoisted(() => ({
  ensureDemoDatasetMock: vi.fn()
}));

vi.mock("@/lib/demo-data", () => ({
  ensureDemoDataset: ensureDemoDatasetMock
}));

describe("auth helpers", () => {
  beforeEach(() => {
    ensureDemoDatasetMock.mockReset();
  });

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

  test("demo credentials provision the reserved demo dataset when the user is missing", async () => {
    const passwordHash = await hash(DEMO_PASSWORD, 10);
    const findUniqueMock = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "user_1",
        name: "Avery Chen",
        username: "avery",
        email: DEFAULT_DEMO_USER_EMAIL,
        passwordHash,
        avatarUrl: null
      });
    const prisma = {
      user: {
        findUnique: findUniqueMock
      }
    };

    const user = await authorizeCredentials(prisma as never, {
      email: DEFAULT_DEMO_USER_EMAIL,
      password: DEMO_PASSWORD
    });

    expect(ensureDemoDatasetMock).toHaveBeenCalledWith(prisma);
    expect(findUniqueMock).toHaveBeenCalledTimes(2);
    expect(user?.email).toBe(DEFAULT_DEMO_USER_EMAIL);
  });

  test("demo credentials repair stale password hashes for reserved demo users", async () => {
    const stalePasswordHash = await hash("oldpassword123", 10);
    const repairedPasswordHash = await hash(DEMO_PASSWORD, 10);
    const findUniqueMock = vi
      .fn()
      .mockResolvedValueOnce({
        id: "user_1",
        name: "Avery Chen",
        username: "avery",
        email: DEFAULT_DEMO_USER_EMAIL,
        passwordHash: stalePasswordHash,
        avatarUrl: null
      })
      .mockResolvedValueOnce({
        id: "user_1",
        name: "Avery Chen",
        username: "avery",
        email: DEFAULT_DEMO_USER_EMAIL,
        passwordHash: repairedPasswordHash,
        avatarUrl: null
      });
    const prisma = {
      user: {
        findUnique: findUniqueMock
      }
    };

    const user = await authorizeCredentials(prisma as never, {
      email: DEFAULT_DEMO_USER_EMAIL,
      password: DEMO_PASSWORD
    });

    expect(ensureDemoDatasetMock).toHaveBeenCalledWith(prisma);
    expect(findUniqueMock).toHaveBeenCalledTimes(2);
    expect(user?.username).toBe("avery");
  });

  test("wrong demo password does not provision demo data", async () => {
    const findUniqueMock = vi.fn().mockResolvedValue(null);
    const prisma = {
      user: {
        findUnique: findUniqueMock
      }
    };

    const user = await authorizeCredentials(prisma as never, {
      email: DEFAULT_DEMO_USER_EMAIL,
      password: "nottherightone"
    });

    expect(ensureDemoDatasetMock).not.toHaveBeenCalled();
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
    const acceptedAt = new Date("2026-03-21T12:00:00.000Z");
    const legalAcceptance = createLegalAcceptanceRecord(acceptedAt);
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
      avatarUrl: "https://lh3.googleusercontent.com/a/test-avatar"
    }, legalAcceptance);

    expect(user?.email).toBe("newgoogle@pinly.demo");
    expect(user?.username.startsWith("new_google")).toBe(true);
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          avatarUrl: null,
          termsAcceptedAt: acceptedAt,
          privacyAcceptedAt: acceptedAt,
          termsVersion: legalAcceptance.termsVersion,
          privacyVersion: legalAcceptance.privacyVersion
        })
      })
    );
  });

  test("google sign in requires legal acceptance for new users", async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
        update: vi.fn()
      }
    };

    await expect(
      ensureGoogleUser(prisma as never, {
        email: "newgoogle@pinly.demo",
        name: "New Google",
        avatarUrl: "https://lh3.googleusercontent.com/a/test-avatar"
      })
    ).rejects.toBeInstanceOf(LegalAcceptanceRequiredError);

    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  test("existing google users can still sign in without a new acceptance record", async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: "google_existing",
          name: "Existing Google",
          username: "existing_google",
          email: "existing@pinly.demo",
          passwordHash: "hashed",
          avatarUrl: null
        }),
        create: vi.fn(),
        update: vi.fn()
      }
    };

    const user = await ensureGoogleUser(prisma as never, {
      email: "existing@pinly.demo",
      name: "Existing Google"
    });

    expect(user?.id).toBe("google_existing");
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
