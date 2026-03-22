import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPrismaSchemaNotReadyError } from "@/lib/prisma-errors";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  scope: string;
  request: Request;
  limit: number;
  windowMs: number;
  userId?: string | null;
  key?: string | null;
};

type RateLimitBackend = "database" | "memory";

const rateLimitBuckets = new Map<string, RateLimitBucket>();
let hasLoggedDevelopmentFallback = false;

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  return request.headers.get("x-real-ip") ?? request.headers.get("cf-connecting-ip");
}

function hashIdentifier(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function resolveRateLimitBackend(): RateLimitBackend {
  const configuredBackend = process.env.RATE_LIMIT_DRIVER?.trim().toLowerCase();

  if (configuredBackend === "memory" || configuredBackend === "database") {
    return configuredBackend;
  }

  return process.env.NODE_ENV === "test" ? "memory" : "database";
}

function buildActorKey(request: Request, userId?: string | null) {
  if (userId) {
    return `user:${userId}`;
  }

  const ip = getClientIp(request);

  if (ip) {
    return `ip:${ip}`;
  }

  const userAgent = request.headers.get("user-agent") ?? "unknown";
  return `anon:${hashIdentifier(userAgent).slice(0, 16)}`;
}

function pruneExpiredBuckets(now: number) {
  for (const [bucketKey, bucket] of rateLimitBuckets.entries()) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(bucketKey);
    }
  }
}

function createRateLimitExceededResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    {
      error: "Too many requests. Please try again later.",
      code: "RATE_LIMITED"
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds)
      }
    }
  );
}

function createRateLimitUnavailableResponse() {
  return NextResponse.json(
    {
      error: "Rate limiting is temporarily unavailable. Please try again shortly.",
      code: "RATE_LIMIT_UNAVAILABLE"
    },
    {
      status: 503,
      headers: {
        "Retry-After": "60"
      }
    }
  );
}

function buildMemoryBucketKey({ scope, request, userId, key }: RateLimitOptions) {
  const actorKey = buildActorKey(request, userId);
  return [scope, actorKey, key ? hashIdentifier(key).slice(0, 16) : null].filter(Boolean).join(":");
}

function buildDatabaseBucketKeyHash({ request, userId, key }: Pick<RateLimitOptions, "request" | "userId" | "key">) {
  const actorKey = buildActorKey(request, userId);
  return hashIdentifier([actorKey, key ? hashIdentifier(key) : null].filter(Boolean).join(":"));
}

function enforceMemoryRateLimit({
  scope,
  request,
  limit,
  windowMs,
  userId,
  key
}: RateLimitOptions) {
  const now = Date.now();
  pruneExpiredBuckets(now);

  const scopedKey = buildMemoryBucketKey({
    scope,
    request,
    userId,
    key,
    limit,
    windowMs
  });
  const existing = rateLimitBuckets.get(scopedKey);

  if (!existing || existing.resetAt <= now) {
    rateLimitBuckets.set(scopedKey, {
      count: 1,
      resetAt: now + windowMs
    });

    return null;
  }

  if (existing.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return createRateLimitExceededResponse(retryAfterSeconds);
  }

  existing.count += 1;
  rateLimitBuckets.set(scopedKey, existing);
  return null;
}

async function enforceDatabaseRateLimit({
  scope,
  request,
  limit,
  windowMs,
  userId,
  key
}: RateLimitOptions) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);
  const bucketKeyHash = buildDatabaseBucketKeyHash({ request, userId, key });

  try {
    if (Math.random() < 0.05) {
      await prisma.rateLimitEvent.deleteMany({
        where: {
          expiresAt: {
            lte: now
          }
        }
      });
    }

    const existingCount = await prisma.rateLimitEvent.count({
      where: {
        scope,
        bucketKeyHash,
        createdAt: {
          gte: windowStart
        }
      }
    });

    if (existingCount >= limit) {
      const oldestRequest = await prisma.rateLimitEvent.findFirst({
        where: {
          scope,
          bucketKeyHash,
          createdAt: {
            gte: windowStart
          }
        },
        orderBy: {
          createdAt: "asc"
        },
        select: {
          createdAt: true
        }
      });
      const retryAfterSeconds = oldestRequest
        ? Math.max(1, Math.ceil((oldestRequest.createdAt.getTime() + windowMs - now.getTime()) / 1000))
        : Math.max(1, Math.ceil(windowMs / 1000));

      return createRateLimitExceededResponse(retryAfterSeconds);
    }

    await prisma.rateLimitEvent.create({
      data: {
        scope,
        bucketKeyHash,
        expiresAt: new Date(now.getTime() + windowMs)
      }
    });

    return null;
  } catch (error) {
    if (process.env.NODE_ENV !== "production" && isPrismaSchemaNotReadyError(error)) {
      if (!hasLoggedDevelopmentFallback) {
        console.warn(
          "Rate limit database table is not ready yet. Falling back to the in-memory limiter outside production until migrations are applied."
        );
        hasLoggedDevelopmentFallback = true;
      }

      return enforceMemoryRateLimit({
        scope,
        request,
        limit,
        windowMs,
        userId,
        key
      });
    }

    console.error("Rate limit backend error:", error);
    return createRateLimitUnavailableResponse();
  }
}

export async function enforceRateLimit(options: RateLimitOptions) {
  if (resolveRateLimitBackend() === "memory") {
    return enforceMemoryRateLimit(options);
  }

  return enforceDatabaseRateLimit(options);
}

export function resetRateLimitBuckets() {
  rateLimitBuckets.clear();
}
