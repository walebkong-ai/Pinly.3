import { z } from "zod";
import { auth } from "@/lib/auth";
import { apiError, apiValidationError, readJsonBody, toApiErrorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isPrismaSchemaNotReadyError } from "@/lib/prisma-errors";
import { enforceRateLimit } from "@/lib/rate-limit";

const markNotificationsReadSchema = z
  .object({
    notificationIds: z.array(z.string().cuid()).max(50).optional(),
    markAll: z.boolean().optional()
  })
  .refine((value) => value.markAll === true || (value.notificationIds?.length ?? 0) > 0, {
    message: "Provide notificationIds or markAll."
  });

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const rateLimitResponse = await enforceRateLimit({
    scope: "notifications-read",
    request,
    userId: session.user.id,
    limit: 60,
    windowMs: 10 * 60 * 1000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let body: unknown;

  try {
    body = await readJsonBody(request, {
      maxBytes: 12 * 1024,
      invalidJsonCode: "NOTIFICATIONS_READ_INVALID_JSON",
      invalidJsonMessage: "Invalid JSON payload."
    });
  } catch (error) {
    return toApiErrorResponse(error);
  }

  const parsed = markNotificationsReadSchema.safeParse(body);

  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  const where = {
    userId: session.user.id,
    readAt: null,
    ...(parsed.data.markAll === true
      ? {}
      : {
          id: {
            in: parsed.data.notificationIds ?? []
          }
        })
  };

  const now = new Date();

  let unreadCount = 0;

  try {
    await prisma.notification.updateMany({
      where,
      data: {
        readAt: now
      }
    });

    unreadCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        readAt: null
      }
    });
  } catch (error) {
    if (!isPrismaSchemaNotReadyError(error)) {
      throw error;
    }
  }

  return Response.json({ ok: true, unreadCount });
}
