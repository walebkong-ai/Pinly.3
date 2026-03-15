import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { z } from "zod";

export const runtime = "nodejs";

const commentSchema = z.object({
  content: z.string().min(1).max(1000)
});

// GET = list comments for a post
export async function GET(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const { postId } = await params;

  const comments = await prisma.comment.findMany({
    where: { postId },
    include: {
      user: {
        select: { id: true, name: true, username: true, avatarUrl: true }
      }
    },
    orderBy: { createdAt: "asc" },
    take: 100
  });

  return Response.json({ comments });
}

// POST = add a comment
export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const { postId } = await params;

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

  const comment = await prisma.comment.create({
    data: {
      postId,
      userId: session.user.id,
      content: parsed.data.content
    },
    include: {
      user: {
        select: { id: true, name: true, username: true, avatarUrl: true }
      }
    }
  });

  return Response.json({ comment }, { status: 201 });
}
