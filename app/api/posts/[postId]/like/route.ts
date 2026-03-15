import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";

export const runtime = "nodejs";

// POST = like, DELETE = unlike
export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const { postId } = await params;

  try {
    await prisma.like.create({
      data: { postId, userId: session.user.id }
    });
    const count = await prisma.like.count({ where: { postId } });
    return Response.json({ liked: true, likeCount: count });
  } catch (error: unknown) {
    // Unique constraint = already liked, just return current state
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2002") {
      const count = await prisma.like.count({ where: { postId } });
      return Response.json({ liked: true, likeCount: count });
    }
    return apiError("Could not like post", 500);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const { postId } = await params;

  await prisma.like.deleteMany({
    where: { postId, userId: session.user.id }
  });

  const count = await prisma.like.count({ where: { postId } });
  return Response.json({ liked: false, likeCount: count });
}
