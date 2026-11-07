import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { getVisiblePostById, getVisibleUserIds } from "@/lib/data";
import { normalizeProfileImageUrl, normalizeStoredMediaUrl } from "@/lib/media-url";
import { classifyLegacyMediaUrl } from "@/lib/legacy-media";
import { isHeicUrl } from "@/lib/heic";
import { convertHeicToJpeg, readHeicResponse } from "@/lib/server-heic";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSignedSupabaseObjectUrl } from "@/lib/supabase-storage";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_MEDIA_SOURCE_LENGTH = 2048;

function buildMediaResponseHeaders(response: Response) {
  const headers = new Headers({
    "Cache-Control": "private, max-age=120, stale-while-revalidate=600",
    Vary: "Cookie"
  });

  for (const headerName of [
    "accept-ranges",
    "content-disposition",
    "content-length",
    "content-range",
    "content-type",
    "etag",
    "last-modified"
  ]) {
    const headerValue = response.headers.get(headerName);

    if (headerValue) {
      headers.set(headerName, headerValue);
    }
  }

  return headers;
}

async function canViewProtectedMedia(viewerId: string, rawSource: string) {
  const legacySource = classifyLegacyMediaUrl(rawSource, "post");
  const normalizedPostMediaUrl = normalizeStoredMediaUrl(rawSource) ??
    (legacySource?.category === "vercel_blob_heic" ? legacySource.originalUrl : null);

  if (normalizedPostMediaUrl) {
    const matchingPost = await prisma.post.findFirst({
      where: {
        OR: [{ mediaUrl: normalizedPostMediaUrl }, { thumbnailUrl: normalizedPostMediaUrl }]
      },
      select: {
        id: true
      }
    });

    if (!matchingPost) {
      return false;
    }

    return Boolean(await getVisiblePostById(viewerId, matchingPost.id));
  }

  const normalizedAvatarUrl = normalizeProfileImageUrl(rawSource);

  if (!normalizedAvatarUrl) {
    return false;
  }

  const visibleUserIds = await getVisibleUserIds(viewerId);
  const visibleAvatarOwner = await prisma.user.findFirst({
    where: {
      id: { in: visibleUserIds },
      avatarUrl: normalizedAvatarUrl
    },
    select: {
      id: true
    }
  });

  return Boolean(visibleAvatarOwner);
}

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const rateLimitResponse = await enforceRateLimit({
    scope: "media-read",
    request,
    userId: session.user.id,
    limit: 240,
    windowMs: 60 * 1000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { searchParams } = new URL(request.url);
  const source = searchParams.get("src")?.trim() ?? "";

  if (!source) {
    return apiError("Media source is required.", 400, {
      code: "MEDIA_SOURCE_REQUIRED"
    });
  }

  if (source.length > MAX_MEDIA_SOURCE_LENGTH) {
    return apiError("Media source is too long.", 414, {
      code: "MEDIA_SOURCE_TOO_LONG"
    });
  }

  let allowed = false;

  try {
    allowed = await canViewProtectedMedia(session.user.id, source);
  } catch {
    allowed = false;
  }

  if (!allowed) {
    return apiError("Media not found.", 404, {
      code: "MEDIA_NOT_FOUND"
    });
  }

  try {
    const legacySource = classifyLegacyMediaUrl(source, "post");
    const isLegacyHeic = legacySource?.category === "vercel_blob_heic";
    const convertHeic = isHeicUrl(source);
    const upstreamUrl = isLegacyHeic ? legacySource.originalUrl : await createSignedSupabaseObjectUrl(source);
    const upstreamResponse = await fetch(upstreamUrl, {
      cache: "no-store",
      // A legacy URL must never redirect the server to another host.
      redirect: "error",
      signal: AbortSignal.timeout(20_000),
      headers: !convertHeic && request.headers.get("range")
        ? {
            Range: request.headers.get("range") as string
          }
        : undefined
    });

    if (!upstreamResponse.ok || !upstreamResponse.body) {
      return apiError("Media is temporarily unavailable.", 502, {
        code: "MEDIA_UPSTREAM_UNAVAILABLE"
      });
    }

    if (convertHeic) {
      const jpeg = await convertHeicToJpeg(await readHeicResponse(upstreamResponse));

      // Upstream length, etag and range headers describe the HEIC, not this JPEG.
      return new Response(jpeg, {
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Length": String(jpeg.byteLength),
          "Cache-Control": "private, max-age=120, stale-while-revalidate=600",
          "X-Content-Type-Options": "nosniff",
          Vary: "Cookie"
        }
      });
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: buildMediaResponseHeaders(upstreamResponse)
    });
  } catch {
    return apiError("Media is temporarily unavailable.", 502, {
      code: "MEDIA_FETCH_FAILED"
    });
  }
}
