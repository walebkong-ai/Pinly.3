import { randomUUID } from "node:crypto";

type UsernameLookupPrisma = {
  user: {
    findUnique: (...args: any[]) => Promise<{ id: string } | null>;
  };
};

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

export async function createUniqueUsername(prisma: UsernameLookupPrisma, seed: string) {
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
