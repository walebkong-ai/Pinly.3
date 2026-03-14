import { auth } from "@/lib/auth";
import { getVisiblePostById } from "@/lib/data";
import { apiError } from "@/lib/api";

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

export async function DELETE(request: Request, context: Context) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const { postId } = await context.params;
  
  const { prisma } = await import("@/lib/prisma");

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { userId: true, mediaUrl: true }
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

  if (post.mediaUrl.includes("vercel-storage.com")) {
    const { del } = await import("@vercel/blob");
    await del(post.mediaUrl).catch(console.error);
  }

  return Response.json({ success: true });
}
