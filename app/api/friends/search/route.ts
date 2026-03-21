import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPrismaSchemaNotReadyError } from "@/lib/prisma-errors";
import { getRelationshipDetailsForTargets } from "@/lib/relationships";
import { apiError } from "@/lib/api";
import { getSearchTerms, rankBySearch } from "@/lib/search";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const rateLimitResponse = enforceRateLimit({
    scope: "friends-search",
    request,
    userId: session.user.id,
    limit: 60,
    windowMs: 60 * 1000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();
  const searchTerms = getSearchTerms(query);

  if (searchTerms.length === 0 || query.trim().length < 2) {
    return Response.json({ users: [] });
  }

  const currentUserId = session.user.id;
  let blockRecords: Array<{ blockerId: string; blockedId: string }> = [];

  try {
    blockRecords = await prisma.block.findMany({
      where: {
        OR: [{ blockerId: currentUserId }, { blockedId: currentUserId }]
      },
      select: {
        blockerId: true,
        blockedId: true
      }
    });
  } catch (error) {
    if (!isPrismaSchemaNotReadyError(error)) {
      throw error;
    }
  }

  const blockedUserIds = new Set<string>(
    blockRecords.map((b) => (b.blockerId === currentUserId ? b.blockedId : b.blockerId))
  );

  const users = await prisma.user.findMany({
    where: {
      id: { not: currentUserId, notIn: Array.from(blockedUserIds) },
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
  const relationships = await getRelationshipDetailsForTargets(
    currentUserId,
    users.map((user) => user.id)
  );

  const mapped = users.map((user) => {
    const relationship = relationships.get(user.id);
    const requestStatus =
      relationship?.status === "friends" ||
      relationship?.status === "pending_sent" ||
      relationship?.status === "pending_received"
        ? relationship.status
        : "none";

    return {
      ...user,
      requestStatus,
      requestId: relationship?.activeRequestId ?? null
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
