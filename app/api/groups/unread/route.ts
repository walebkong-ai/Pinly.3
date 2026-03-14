import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const userId = session.user.id;

  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    select: { groupId: true, lastReadAt: true }
  });

  if (memberships.length === 0) {
    return Response.json({ unreadCount: 0 });
  }

  let totalUnread = 0;

  for (const member of memberships) {
    const unreadMessages = await prisma.groupMessage.count({
      where: {
        groupId: member.groupId,
        createdAt: {
          gt: member.lastReadAt
        }
      }
    });
    totalUnread += unreadMessages;
  }

  return Response.json({ unreadCount: totalUnread });
}
