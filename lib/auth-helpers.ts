import { randomUUID } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { ensureDemoDataset, type DemoProvisionPrisma } from "@/lib/demo-data";
import { isDemoCredentials } from "@/lib/demo-config";
import type { LegalAcceptanceRecord } from "@/lib/legal";
import { normalizeProfileImageUrl } from "@/lib/media-url";
import { signInSchema } from "@/lib/validation";
import { createUniqueUsername, normalizeUsernameSeed } from "@/lib/usernames";

type UserRecord = {
  id: string;
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  avatarUrl: string | null;
};

type AuthPrisma = DemoProvisionPrisma;

export type AuthUserPayload = {
  id: string;
  email: string;
  name: string;
  username: string;
  avatarUrl: string | null;
};

export class LegalAcceptanceRequiredError extends Error {
  constructor() {
    super("Legal acceptance is required before creating a new account.");
  }
}

function toPayload(user: UserRecord): AuthUserPayload {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    username: user.username,
    avatarUrl: user.avatarUrl
  };
}

export { createUniqueUsername, normalizeUsernameSeed };

export async function authorizeCredentials(prisma: AuthPrisma, credentials: unknown) {
  const parsed = signInSchema.safeParse(credentials);

  if (!parsed.success) {
    return null;
  }

  const wantsDemoAccess = isDemoCredentials(parsed.data.email, parsed.data.password);
  let user;
  try {
    user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() }
    });

    if (!user && wantsDemoAccess) {
      await ensureDemoDataset(prisma);
      user = await prisma.user.findUnique({
        where: { email: parsed.data.email.toLowerCase() }
      });
    }
  } catch (error) {
    console.error("Database connection error during authorization:", error);
    return null;
  }

  if (!user) {
    return null;
  }

  let passwordsMatch = await compare(parsed.data.password, user.passwordHash);

  if (!passwordsMatch && wantsDemoAccess) {
    try {
      await ensureDemoDataset(prisma);
      user = await prisma.user.findUnique({
        where: { email: parsed.data.email.toLowerCase() }
      });
    } catch (error) {
      console.error("Database connection error during demo authorization:", error);
      return null;
    }

    if (!user) {
      return null;
    }

    passwordsMatch = await compare(parsed.data.password, user.passwordHash);
  }

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
  },
  legalAcceptance?: LegalAcceptanceRecord
) {
  const normalizedEmail = email.toLowerCase();
  const fallbackName = normalizedEmail.split("@")[0] || "Pinly Traveler";
  const displayName = (name ?? "").trim() || fallbackName;
  const normalizedAvatarUrl = normalizeProfileImageUrl(avatarUrl ?? null);
  let existing = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (!existing) {
    if (!legalAcceptance) {
      throw new LegalAcceptanceRequiredError();
    }

    const username = await createUniqueUsername(prisma, displayName);
    const passwordHash = await hash(randomUUID(), 10);
    existing = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: displayName,
        username,
        passwordHash,
        avatarUrl: normalizedAvatarUrl,
        ...legalAcceptance
      }
    });

    return toPayload(existing);
  }

  const needsUpdate =
    (normalizedAvatarUrl && existing.avatarUrl !== normalizedAvatarUrl) ||
    (!existing.name && displayName);

  if (!needsUpdate) {
    return toPayload(existing);
  }

  const updated = await prisma.user.update({
    where: { id: existing.id },
    data: {
      name: existing.name || displayName,
      avatarUrl: normalizedAvatarUrl ?? existing.avatarUrl
    }
  });

  return toPayload(updated);
}
