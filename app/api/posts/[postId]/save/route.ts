import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { getVisiblePostById } from "@/lib/data";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const { postId } = await params;
  const visiblePost = await getVisiblePostById(session.user.id, postId);

  if (!visiblePost) {
    return apiError("Post not found or unavailable.", 404);
  }

  try {
    await prisma.savedPost.create({
      data: {
        postId,
        userId: session.user.id
      }
    });

    return Response.json({ saved: true });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2002") {
      return Response.json({ saved: true });
    }

    return apiError("Could not save post", 500);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const { postId } = await params;

  await prisma.savedPost.deleteMany({
    where: {
      postId,
      userId: session.user.id
    }
  });

  return Response.json({ saved: false });
}
