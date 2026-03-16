import { auth } from "@/lib/auth";
import { getVisiblePostById } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ postId: string; commentId: string }>;
};

export async function DELETE(
  _request: Request,
  { params }: Context
) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const { postId, commentId } = await params;
  const post = await getVisiblePostById(session.user.id, postId);

  if (!post) {
    return apiError("Post not found", 404);
  }

  const comment = await prisma.comment.findUnique({
    where: {
      id: commentId
    },
    select: {
      id: true,
      postId: true,
      parentId: true,
      userId: true
    }
  });

  if (!comment || comment.postId !== postId) {
    return apiError("Comment not found", 404);
  }

  if (comment.userId !== session.user.id && post.userId !== session.user.id) {
    return apiError("Forbidden", 403);
  }

  await prisma.comment.delete({
    where: {
      id: commentId
    }
  });

  return Response.json({
    success: true,
    deletedCommentId: comment.id,
    parentId: comment.parentId
  });
}
