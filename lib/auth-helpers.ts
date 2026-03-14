import { randomUUID } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { signInSchema } from "@/lib/validation";

type UserRecord = {
  id: string;
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  avatarUrl: string | null;
};

type AuthPrisma = {
  user: {
    findUnique: (...args: any[]) => Promise<UserRecord | null>;
    create: (...args: any[]) => Promise<UserRecord>;
    update: (...args: any[]) => Promise<UserRecord>;
  };
};

export type AuthUserPayload = {
  id: string;
  email: string;
  name: string;
  username: string;
  avatarUrl: string | null;
};

function toPayload(user: UserRecord): AuthUserPayload {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    username: user.username,
    avatarUrl: user.avatarUrl
  };
}

export function normalizeUsernameSeed(value: string) {
  const fromEmail = value.includes("@") ? value.split("@")[0] ?? value : value;
  const normalized = fromEmail
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

  let base = normalized || "traveler";

  if (base.length < 3) {
    base = `${base}_pinly`;
  }

  base = base.slice(0, 20).replace(/_+$/g, "");

  if (base.length < 3) {
    return "traveler";
  }

  return base;
}

export async function createUniqueUsername(prisma: AuthPrisma, seed: string) {
  const base = normalizeUsernameSeed(seed);

  for (let index = 0; index < 100; index += 1) {
    const suffix = index === 0 ? "" : String(index);
    const maxBaseLength = 20 - suffix.length;
    const candidateBase = base.slice(0, Math.max(3, maxBaseLength)).replace(/_+$/g, "");
    const candidate = `${candidateBase}${suffix}`;
    const existing = await prisma.user.findUnique({
      where: { username: candidate }
    });

    if (!existing) {
      return candidate;
    }
  }

  return `pinly_${randomUUID().replace(/-/g, "").slice(0, 14)}`;
}

export async function authorizeCredentials(prisma: AuthPrisma, credentials: unknown) {
  const parsed = signInSchema.safeParse(credentials);

  if (!parsed.success) {
    return null;
  }

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() }
    });
  } catch (error) {
    console.error("Database connection error during authorization:", error);
    return null;
  }

  if (!user) {
    return null;
  }

  const passwordsMatch = await compare(parsed.data.password, user.passwordHash);

  if (!passwordsMatch) {
    return null;
  }

  return toPayload(user);
}

export async function ensureGoogleUser(
  prisma: AuthPrisma,
  {
    email,
    name,
    avatarUrl
  }: {
    email: string;
    name?: string | null;
    avatarUrl?: string | null;
  }
) {
  const normalizedEmail = email.toLowerCase();
  const fallbackName = normalizedEmail.split("@")[0] || "Pinly Traveler";
  const displayName = (name ?? "").trim() || fallbackName;
  let existing = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (!existing) {
    const username = await createUniqueUsername(prisma, displayName);
    const passwordHash = await hash(randomUUID(), 10);
    existing = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: displayName,
        username,
        passwordHash,
        avatarUrl: avatarUrl ?? null
      }
    });

    return toPayload(existing);
  }

  const needsUpdate =
    (avatarUrl && existing.avatarUrl !== avatarUrl) ||
    (!existing.name && displayName);

  if (!needsUpdate) {
    return toPayload(existing);
  }

  const updated = await prisma.user.update({
    where: { id: existing.id },
    data: {
      name: existing.name || displayName,
      avatarUrl: avatarUrl ?? existing.avatarUrl
    }
  });

  return toPayload(updated);
}
