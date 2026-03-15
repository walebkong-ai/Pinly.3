import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { z } from "zod";

export const runtime = "nodejs";

const updateSchema = z.object({
  showLikeCounts: z.boolean().optional(),
  showCommentCounts: z.boolean().optional()
});

// GET = read current settings
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const settings = await prisma.userSettings.findUnique({
    where: { userId: session.user.id }
  });

  return Response.json({
    showLikeCounts: settings?.showLikeCounts ?? true,
    showCommentCounts: settings?.showCommentCounts ?? true
  });
}

// PUT = update settings
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON", 400);
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid settings", 400);
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      ...parsed.data
    },
    update: parsed.data
  });

  return Response.json({
    showLikeCounts: settings.showLikeCounts,
    showCommentCounts: settings.showCommentCounts
  });
}
