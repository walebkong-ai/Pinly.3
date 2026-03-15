import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const unreadCount = await prisma.notification.count({
    where: {
      userId: session.user.id,
      readAt: null
    }
  });

  return Response.json({ unreadCount });
}
