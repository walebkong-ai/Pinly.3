import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { isPrismaSchemaNotReadyError } from "@/lib/prisma-errors";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  let unreadCount = 0;

  try {
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

  return Response.json({ unreadCount });
}
