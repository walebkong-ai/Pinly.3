import { z } from "zod";
import { auth } from "@/lib/auth";
import { apiError, apiValidationError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isPrismaSchemaNotReadyError } from "@/lib/prisma-errors";

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

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON payload.", 400, { code: "NOTIFICATIONS_READ_INVALID_JSON" });
  }

  const parsed = markNotificationsReadSchema.safeParse(body);

  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  const where =
    parsed.data.markAll === true
      ? {
          userId: session.user.id,
          readAt: null
        }
      : {
          userId: session.user.id,
          id: {
            in: parsed.data.notificationIds ?? []
          }
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
