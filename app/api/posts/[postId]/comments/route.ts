import { auth } from "@/lib/auth";
import { getVisiblePostById } from "@/lib/data";
import { createNotificationSafely } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const commentSchema = z.object({
  content: z.string().min(1).max(1000),
  parentId: z.string().cuid().optional()
});

// GET = list comments for a post
export async function GET(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const { postId } = await params;
  const post = await getVisiblePostById(session.user.id, postId);

  if (!post) {
    return apiError("Post not found", 404);
  }

  if (post.user.settings?.commentsEnabled === false) {
    return apiError("Comments are turned off for this post", 403, {
      code: "COMMENTS_DISABLED"
    });
  }

  const comments = await prisma.comment.findMany({
    where: {
      postId,
      parentId: null
    },
    include: {
      user: {
        select: { id: true, name: true, username: true, avatarUrl: true }
      },
      replies: {
        include: {
          user: {
            select: { id: true, name: true, username: true, avatarUrl: true }
          }
        },
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: { createdAt: "asc" },
    take: 100
  });

  return Response.json({
    comments,
    currentUserId: session.user.id,
    postOwnerId: post.userId
  });
}

// POST = add a comment
export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const rateLimitResponse = await enforceRateLimit({
    scope: "post-comments-create",
    request,
    userId: session.user.id,
    limit: 30,
    windowMs: 10 * 60 * 1000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { postId } = await params;
  const post = await getVisiblePostById(session.user.id, postId);

  if (!post) {
    return apiError("Post not found", 404);
  }

  if (post.user.settings?.commentsEnabled === false) {
    return apiError("Comments are turned off for this post", 403, {
      code: "COMMENTS_DISABLED"
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON", 400);
  }

  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Comment must be 1-1000 characters", 400);
  }

  let parentId: string | null = null;
  let parentCommentUserId: string | null = null;

  if (parsed.data.parentId) {
    const parentComment = await prisma.comment.findFirst({
      where: {
        id: parsed.data.parentId,
        postId
      },
      select: {
        id: true,
        parentId: true,
        userId: true
      }
    });

    if (!parentComment) {
      return apiError("Parent comment not found", 404);
    }

    if (parentComment.parentId) {
      return apiError("Replies can only go one level deep", 400);
    }

    parentId = parentComment.id;
    parentCommentUserId = parentComment.userId;
  }

  const comment = await prisma.comment.create({
    data: {
      postId,
      userId: session.user.id,
      content: parsed.data.content,
      parentId
    },
    include: {
      user: {
        select: { id: true, name: true, username: true, avatarUrl: true }
      }
    }
  });

  if (parentId && parentCommentUserId && parentCommentUserId !== session.user.id) {
    await createNotificationSafely({
      userId: parentCommentUserId,
      actorId: session.user.id,
      type: "COMMENT_REPLIED",
      postId,
      commentId: comment.id,
      dedupeKey: `COMMENT_REPLIED:${comment.id}`
    });
  }

  if (!parentId && post.userId !== session.user.id) {
    await createNotificationSafely({
      userId: post.userId,
      actorId: session.user.id,
      type: "POST_COMMENTED",
      postId,
      commentId: comment.id,
      dedupeKey: `POST_COMMENTED:${comment.id}`
    });
  }

  if (parentId && post.userId !== session.user.id && post.userId !== parentCommentUserId) {
    await createNotificationSafely({
      userId: post.userId,
      actorId: session.user.id,
      type: "POST_COMMENTED",
      postId,
      commentId: comment.id,
      dedupeKey: `POST_COMMENTED:${comment.id}:OWNER`
    });
  }

  return Response.json({ comment: { ...comment, replies: [] } }, { status: 201 });
}
