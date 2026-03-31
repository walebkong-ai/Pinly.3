import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { getVisiblePostById, getVisibleUserIds } from "@/lib/data";
import { normalizeProfileImageUrl, normalizeStoredMediaUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSignedSupabaseObjectUrl } from "@/lib/supabase-storage";

export const runtime = "nodejs";

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
  const normalizedPostMediaUrl = normalizeStoredMediaUrl(rawSource);

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
    const signedUrl = await createSignedSupabaseObjectUrl(source);
    const upstreamResponse = await fetch(signedUrl, {
      cache: "no-store",
      headers: request.headers.get("range")
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
