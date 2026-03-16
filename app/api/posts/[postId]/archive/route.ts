import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Context = {
  params: Promise<{ postId: string }>;
};

export const runtime = "nodejs";

export async function PATCH(request: Request, context: Context) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON payload.", 400, { code: "ARCHIVE_INVALID_JSON" });
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

  const { postId } = await context.params;
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
