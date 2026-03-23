import { auth } from "@/lib/auth";
import { getVisiblePostById } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  buildPostReportDedupeKey,
  isUniqueConstraintError,
  reportPayloadSchema
} from "@/lib/reporting";

export const runtime = "nodejs";

type Context = {
  params: Promise<{ postId: string }>;
};

export async function POST(request: Request, { params }: Context) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const rateLimitResponse = await enforceRateLimit({
    scope: "post-report",
    request,
    userId: session.user.id,
    limit: 12,
    windowMs: 60 * 60 * 1000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { postId } = await params;
  const post = await getVisiblePostById(session.user.id, postId);

  if (!post) {
    return apiError("Post not found", 404);
  }

  if (post.userId === session.user.id) {
    return apiError("You cannot report your own post.", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid report payload.", 400);
  }

  const parsed = reportPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Invalid report payload.", 400);
  }

  try {
    await prisma.report.create({
      data: {
        reporterId: session.user.id,
        reportedId: post.userId,
        postId,
        category: parsed.data.category,
        reason: parsed.data.details ?? null,
        dedupeKey: buildPostReportDedupeKey(session.user.id, postId, parsed.data.category)
      }
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return Response.json({ success: true, duplicate: true });
    }

    console.error("Error reporting post:", error);
    return apiError("Could not submit report.", 500);
  }

  return Response.json({ success: true });
}
