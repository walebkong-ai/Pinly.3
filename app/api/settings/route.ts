import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, readJsonBody, toApiErrorResponse } from "@/lib/api";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const updateSchema = z.object({
  showLikeCounts: z.boolean().optional(),
  showCommentCounts: z.boolean().optional(),
  commentsEnabled: z.boolean().optional()
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
    showCommentCounts: settings?.showCommentCounts ?? true,
    commentsEnabled: settings?.commentsEnabled ?? true
  });
}

// PUT = update settings
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const rateLimitResponse = await enforceRateLimit({
    scope: "settings-update",
    request,
    userId: session.user.id,
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
      invalidJsonMessage: "Invalid JSON.",
      invalidJsonCode: "SETTINGS_INVALID_JSON"
    });
  } catch (error) {
    return toApiErrorResponse(error);
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
    showCommentCounts: settings.showCommentCounts,
    commentsEnabled: settings.commentsEnabled
  });
}
