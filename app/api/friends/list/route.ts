import { auth } from "@/lib/auth";
import { getFriendIds } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const [friendIds, incomingRequests, outgoingRequests] = await Promise.all([
    getFriendIds(session.user.id),
    prisma.friendRequest.findMany({
      where: {
        toUserId: session.user.id,
        status: "PENDING"
      },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.friendRequest.findMany({
      where: {
        fromUserId: session.user.id,
        status: "PENDING"
      },
      include: {
        toUser: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const friends = await prisma.user.findMany({
    where: { id: { in: friendIds } },
    select: {
      id: true,
      name: true,
      username: true,
      avatarUrl: true
    },
    orderBy: { username: "asc" }
  });

  return Response.json({
    friends,
    incomingRequests,
    outgoingRequests
  });
}
