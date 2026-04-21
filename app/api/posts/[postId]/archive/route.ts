import { auth } from "@/lib/auth";
import { apiError, readJsonBody, toApiErrorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";

type Context = {
  params: Promise<{ postId: string }>;
};

export const runtime = "nodejs";

export async function PATCH(request: Request, context: Context) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const { postId } = await context.params;
  const rateLimitResponse = await enforceRateLimit({
    scope: "posts-archive",
    request,
    userId: session.user.id,
    key: postId,
    limit: 30,
    windowMs: 10 * 60 * 1000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let body: unknown;
  try {
    body = await readJsonBody(request, {
      maxBytes: 4 * 1024,
      invalidJsonCode: "ARCHIVE_INVALID_JSON",
      invalidJsonMessage: "Invalid JSON payload."
    });
  } catch (error) {
    return toApiErrorResponse(error);
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as { archived?: unknown }).archived !== "boolean"
  ) {
    return apiError("Archived state must be provided as a boolean.", 400, {
      code: "ARCHIVE_INVALID_STATE"
    });
  }

  const archived = (body as { archived: boolean }).archived;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      userId: true,
      isArchived: true
    }
  });

  if (!post) {
    return apiError("Post not found", 404);
  }

  if (post.userId !== session.user.id) {
    return apiError("Forbidden", 403);
  }

  const updatedPost = await prisma.post.update({
    where: { id: postId },
    data: {
      isArchived: archived
    },
    select: {
      id: true,
      isArchived: true
    }
  });

  return Response.json({ post: updatedPost });
}
