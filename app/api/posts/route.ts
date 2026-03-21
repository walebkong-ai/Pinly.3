import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mapQuerySchema, postSchema } from "@/lib/validation";
import { apiError, apiValidationError } from "@/lib/api";
import { normalizeCountryForStorage } from "@/lib/country-flags";
import { getFriendIds, getMapData } from "@/lib/data";
import { normalizeStoredMediaUrl } from "@/lib/media-url";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const rateLimitResponse = enforceRateLimit({
    scope: "map-posts",
    request,
    userId: session.user.id,
    limit: 180,
    windowMs: 60 * 1000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { searchParams } = new URL(request.url);
  const rawCollectionOverlay = searchParams.get("collectionsOverlay");
  const parsed = mapQuerySchema.safeParse({
    north: searchParams.get("north"),
    south: searchParams.get("south"),
    east: searchParams.get("east"),
    west: searchParams.get("west"),
    zoom: searchParams.get("zoom"),
    q: searchParams.get("q") ?? undefined,
    layer: searchParams.get("layer") ?? undefined,
    time: searchParams.get("time") ?? undefined,
    groups: searchParams.get("groups") ?? undefined,
    categories: searchParams.get("categories") ?? undefined
  });

  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  if (rawCollectionOverlay && rawCollectionOverlay !== "0" && rawCollectionOverlay !== "1") {
    return apiError("Invalid collections overlay flag.", 400, { code: "MAP_COLLECTIONS_OVERLAY_INVALID" });
  }

  const map = await getMapData({
    viewerId: session.user.id,
    bounds: parsed.data,
    zoom: parsed.data.zoom,
    layer: parsed.data.layer,
    time: parsed.data.time,
    groups: parsed.data.groups,
    categories: parsed.data.categories,
    query: parsed.data.q,
    collectionOverlay: rawCollectionOverlay === "1"
  });

  return Response.json(map);
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const rateLimitResponse = enforceRateLimit({
    scope: "posts-create",
    request,
    userId: session.user.id,
    limit: 20,
    windowMs: 10 * 60 * 1000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON payload.", 400, { code: "POST_INVALID_JSON" });
  }

  const parsed = postSchema.safeParse(body);

  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  try {
    const mediaUrl = normalizeStoredMediaUrl(parsed.data.mediaUrl);
    const thumbnailUrl =
      parsed.data.thumbnailUrl === null || parsed.data.thumbnailUrl === undefined
        ? null
        : normalizeStoredMediaUrl(parsed.data.thumbnailUrl);

    if (!mediaUrl) {
      return apiError("Media must come from a trusted Pinly upload.", 400, {
        code: "POST_MEDIA_URL_INVALID"
      });
    }

    if (parsed.data.thumbnailUrl && !thumbnailUrl) {
      return apiError("Thumbnail media must come from a trusted Pinly upload.", 400, {
        code: "POST_THUMBNAIL_URL_INVALID"
      });
    }

    const validFriendIds = await getFriendIds(session.user.id);
    const taggedUserIds = Array.from(new Set(parsed.data.taggedUserIds)).filter(
      (taggedUserId) => taggedUserId !== session.user.id
    );
    const collectionIds = Array.from(new Set(parsed.data.collectionIds));

    if (taggedUserIds.some((taggedUserId) => !validFriendIds.includes(taggedUserId))) {
      return apiError("You can only tag friends who were with you.", 403);
    }

    if (collectionIds.length > 0) {
      const collections = await prisma.postCollection.findMany({
        where: {
          userId: session.user.id,
          id: { in: collectionIds }
        },
        select: { id: true }
      });

      if (collections.length !== collectionIds.length) {
        return apiError("You can only add memories to your own collections.", 403);
      }
    }

    const post = await prisma.post.create({
      data: {
        mediaType: parsed.data.mediaType,
        mediaUrl,
        thumbnailUrl,
        caption: parsed.data.caption,
        placeName: parsed.data.placeName,
        city: parsed.data.city,
        country: normalizeCountryForStorage(parsed.data.country),
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        visitedAt: new Date(parsed.data.visitedAt),
        userId: session.user.id,
        ...(collectionIds.length > 0
          ? {
              collectionEntries: {
                create: collectionIds.map((collectionId) => ({
                  collectionId
                }))
              }
            }
          : {}),
        ...(taggedUserIds.length > 0
          ? {
              visitedWith: {
                create: taggedUserIds.map((taggedUserId) => ({
                  userId: taggedUserId
                }))
              }
            }
          : {})
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true
          }
        },
        visitedWith: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    });

    if (collectionIds.length > 0) {
      await prisma.postCollection.updateMany({
        where: {
          userId: session.user.id,
          id: { in: collectionIds }
        },
        data: {
          updatedAt: new Date()
        }
      });
    }

    return Response.json(
      {
        post: {
          ...post,
          visitedWith: post.visitedWith.map((tag) => tag.user)
        }
      },
      { status: 201 }
    );
  } catch (error) {
    return apiError("Could not save this memory post.", 500, {
      code: "POST_CREATE_FAILED",
      details: error instanceof Error ? error.message : "Unknown post creation failure"
    });
  }
}
