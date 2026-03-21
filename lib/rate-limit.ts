import crypto from "node:crypto";
import { NextResponse } from "next/server";

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

const rateLimitBuckets = new Map<string, RateLimitBucket>();

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

export function enforceRateLimit({
  scope,
  request,
  limit,
  windowMs,
  userId,
  key
}: RateLimitOptions) {
  const now = Date.now();
  pruneExpiredBuckets(now);

  const actorKey = buildActorKey(request, userId);
  const scopedKey = [scope, actorKey, key ? hashIdentifier(key).slice(0, 16) : null].filter(Boolean).join(":");
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

  existing.count += 1;
  rateLimitBuckets.set(scopedKey, existing);
  return null;
}

export function resetRateLimitBuckets() {
  rateLimitBuckets.clear();
}
