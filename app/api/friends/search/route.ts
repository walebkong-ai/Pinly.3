import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getVisibleUserIds } from "@/lib/data";
import { apiError } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim().toLowerCase();

  if (query.length < 2) {
    return Response.json({ users: [] });
  }

  const currentUserId = session.user.id;
  const visibleIds = await getVisibleUserIds(currentUserId);

  const pending = await prisma.friendRequest.findMany({
    where: {
      OR: [{ fromUserId: currentUserId }, { toUserId: currentUserId }]
    },
    select: {
      fromUserId: true,
      toUserId: true,
      status: true
    }
  });

  const users = await prisma.user.findMany({
    where: {
      id: { not: currentUserId },
      username: { contains: query, mode: "insensitive" }
    },
    select: {
      id: true,
      name: true,
      username: true,
      avatarUrl: true
    },
    orderBy: { username: "asc" },
    take: 10
  });

  const mapped = users.map((user) => {
    const relation = pending.find(
      (request) =>
        (request.fromUserId === currentUserId && request.toUserId === user.id) ||
        (request.toUserId === currentUserId && request.fromUserId === user.id)
    );

    const requestStatus = visibleIds.includes(user.id)
      ? "friends"
      : relation?.status === "PENDING" && relation.fromUserId === currentUserId
        ? "pending_sent"
        : relation?.status === "PENDING" && relation.toUserId === currentUserId
          ? "pending_received"
          : "none";

    return {
      ...user,
      requestStatus
    };
  });

  return Response.json({ users: mapped });
}
