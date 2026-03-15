import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getVisibleUserIds } from "@/lib/data";
import { apiError } from "@/lib/api";
import { getSearchTerms, rankBySearch } from "@/lib/search";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();
  const searchTerms = getSearchTerms(query);

  if (searchTerms.length === 0 || query.trim().length < 2) {
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
      AND: searchTerms.map((term) => ({
        OR: [
          { username: { contains: term, mode: "insensitive" } },
          { name: { contains: term, mode: "insensitive" } }
        ]
      }))
    },
    select: {
      id: true,
      name: true,
      username: true,
      avatarUrl: true
    },
    take: 24
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

  const requestStatusWeight: Record<(typeof mapped)[number]["requestStatus"], number> = {
    friends: 18,
    pending_received: 12,
    pending_sent: 8,
    none: 0
  };

  const rankedUsers = rankBySearch(
    mapped,
    query,
    (user) => [
      { value: user.username, weight: 4.5 },
      { value: user.name, weight: 3.6 }
    ],
    (user) => requestStatusWeight[user.requestStatus]
  ).slice(0, 12);

  return Response.json({ users: rankedUsers });
}
