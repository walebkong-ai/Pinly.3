import { auth } from "@/lib/auth";
import { getFriendIds, getVisiblePostById } from "@/lib/data";
import { apiError, apiValidationError } from "@/lib/api";
import { normalizeCountryForStorage } from "@/lib/country-flags";
import { editPostSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import { shouldProxyMediaUrl } from "@/lib/media-url";

type Context = {
  params: Promise<{ postId: string }>;
};

export const runtime = "nodejs";

export async function GET(_: Request, context: Context) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const { postId } = await context.params;
  const post = await getVisiblePostById(session.user.id, postId);

  if (!post) {
    return apiError("Post not found", 404);
  }

  return Response.json({ post });
}

export async function PATCH(request: Request, context: Context) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const { postId } = await context.params;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      userId: true,
      visitedWith: {
        select: {
          userId: true
        }
      }
    }
  });

  if (!post) {
    return apiError("Post not found", 404);
  }

  if (post.userId !== session.user.id) {
    return apiError("Forbidden", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON payload.", 400, { code: "PATCH_INVALID_JSON" });
  }

  const parsed = editPostSchema.safeParse(body);

  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  try {
    const validFriendIds = await getFriendIds(session.user.id);
    const existingTaggedUserIds = new Set(post.visitedWith.map((tag) => tag.userId));
    const taggedUserIds = Array.from(new Set(parsed.data.taggedUserIds)).filter(
      (taggedUserId) => taggedUserId !== session.user.id
    );

    if (
      taggedUserIds.some(
        (taggedUserId) =>
          !validFriendIds.includes(taggedUserId) && !existingTaggedUserIds.has(taggedUserId)
      )
    ) {
      return apiError("You can only add accepted friends to visited with.", 403);
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        caption: parsed.data.caption,
        placeName: parsed.data.placeName,
        city: parsed.data.city,
        country: normalizeCountryForStorage(parsed.data.country),
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        visitedAt: new Date(parsed.data.visitedAt),
        visitedWith: {
          deleteMany: {},
          create: taggedUserIds.map((userId) => ({ userId }))
        }
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

    return Response.json({
      post: {
        ...updatedPost,
        visitedWith: updatedPost.visitedWith.map((tag) => tag.user)
      }
    });
  } catch (error) {
    return apiError("Could not update this memory post.", 500, {
      code: "POST_UPDATE_FAILED",
      details: error instanceof Error ? error.message : "Unknown post update failure"
    });
  }
}

export async function DELETE(request: Request, context: Context) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const { postId } = await context.params;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { userId: true, mediaUrl: true, thumbnailUrl: true }
  });

  if (!post) {
    return apiError("Post not found", 404);
  }

  if (post.userId !== session.user.id) {
    return apiError("Forbidden", 403);
  }

  await prisma.post.delete({
    where: { id: postId }
  });

  const blobUrlsToDelete = [post.mediaUrl, post.thumbnailUrl].filter((url): url is string => shouldProxyMediaUrl(url));

  if (blobUrlsToDelete.length > 0) {
    const { del } = await import("@vercel/blob");
    await del(blobUrlsToDelete).catch(console.error);
  }

  return Response.json({ success: true });
}
