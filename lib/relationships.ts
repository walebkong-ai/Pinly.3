import { Prisma, type Block, type FriendRequest, type Friendship, type PrismaClient } from "@prisma/client";
import { normalizeFriendPair } from "@/lib/friendships";
import { prisma } from "@/lib/prisma";
import { isPrismaSchemaNotReadyError } from "@/lib/prisma-errors";
import type { RelationshipStatus } from "@/types/app";

type RelationshipDb = PrismaClient | Prisma.TransactionClient;

type MinimalFriendship = Pick<Friendship, "userAId" | "userBId">;
type MinimalFriendRequest = Pick<FriendRequest, "id" | "fromUserId" | "toUserId" | "status" | "createdAt" | "updatedAt">;
type MinimalBlock = Pick<Block, "blockerId" | "blockedId">;

export type RelationshipDetails = {
  targetUserId: string;
  status: RelationshipStatus;
  isFriend: boolean;
  isBlocked: boolean;
  incomingRequestId: string | null;
  outgoingRequestId: string | null;
  activeRequestId: string | null;
};

function relationshipNone(targetUserId: string): RelationshipDetails {
  return {
    targetUserId,
    status: "none",
    isFriend: false,
    isBlocked: false,
    incomingRequestId: null,
    outgoingRequestId: null,
    activeRequestId: null
  };
}

async function safeFindMany<T>(query: Promise<T[]>) {
  try {
    return await query;
  } catch (error) {
    if (isPrismaSchemaNotReadyError(error)) {
      return [];
    }

    throw error;
  }
}

function getCounterpartyId(viewerId: string, pair: { userAId?: string; userBId?: string; fromUserId?: string; toUserId?: string; blockerId?: string; blockedId?: string }) {
  if ("userAId" in pair && "userBId" in pair) {
    if (pair.userAId === viewerId) {
      return pair.userBId ?? null;
    }

    if (pair.userBId === viewerId) {
      return pair.userAId ?? null;
    }

    return null;
  }

  if ("fromUserId" in pair && "toUserId" in pair) {
    if (pair.fromUserId === viewerId) {
      return pair.toUserId ?? null;
    }

    if (pair.toUserId === viewerId) {
      return pair.fromUserId ?? null;
    }

    return null;
  }

  if ("blockerId" in pair && "blockedId" in pair) {
    if (pair.blockerId === viewerId) {
      return pair.blockedId ?? null;
    }

    if (pair.blockedId === viewerId) {
      return pair.blockerId ?? null;
    }
  }

  return null;
}

export async function getFriendIdsForViewer(
  viewerId: string,
  options?: {
    db?: RelationshipDb;
  }
) {
  const db = options?.db ?? prisma;

  const [friendships, acceptedRequests, blocks] = await Promise.all([
    safeFindMany(
      db.friendship.findMany({
        where: {
          OR: [{ userAId: viewerId }, { userBId: viewerId }]
        },
        select: {
          userAId: true,
          userBId: true
        }
      })
    ),
    safeFindMany(
      db.friendRequest.findMany({
        where: {
          status: "ACCEPTED",
          OR: [{ fromUserId: viewerId }, { toUserId: viewerId }]
        },
        select: {
          id: true,
          fromUserId: true,
          toUserId: true,
          status: true,
          createdAt: true,
          updatedAt: true
        }
      })
    ),
    safeFindMany(
      db.block.findMany({
        where: {
          OR: [{ blockerId: viewerId }, { blockedId: viewerId }]
        },
        select: {
          blockerId: true,
          blockedId: true
        }
      })
    )
  ]);

  const blockedIds = new Set(
    blocks
      .map((block) => getCounterpartyId(viewerId, block))
      .filter((id): id is string => Boolean(id))
  );
  const friendIds = new Set<string>();

  for (const friendship of friendships) {
    const friendId = getCounterpartyId(viewerId, friendship);

    if (friendId && !blockedIds.has(friendId)) {
      friendIds.add(friendId);
    }
  }

  for (const request of acceptedRequests) {
    const friendId = getCounterpartyId(viewerId, request);

    if (friendId && !blockedIds.has(friendId)) {
      friendIds.add(friendId);
    }
  }

  return Array.from(friendIds);
}

export async function getVisibleUserIdsForViewer(
  viewerId: string,
  options?: {
    db?: RelationshipDb;
  }
) {
  return [viewerId, ...(await getFriendIdsForViewer(viewerId, options))];
}

export async function getRelationshipDetailsForTargets(
  viewerId: string,
  targetUserIds: string[],
  options?: {
    db?: RelationshipDb;
  }
) {
  const db = options?.db ?? prisma;
  const uniqueTargetIds = Array.from(new Set(targetUserIds.filter(Boolean)));
  const detailsByTargetId = new Map<string, RelationshipDetails>();

  for (const targetUserId of uniqueTargetIds) {
    detailsByTargetId.set(
      targetUserId,
      targetUserId === viewerId
        ? {
            targetUserId,
            status: "self",
            isFriend: false,
            isBlocked: false,
            incomingRequestId: null,
            outgoingRequestId: null,
            activeRequestId: null
          }
        : relationshipNone(targetUserId)
    );
  }

  const otherTargetIds = uniqueTargetIds.filter((targetUserId) => targetUserId !== viewerId);

  if (otherTargetIds.length === 0) {
    return detailsByTargetId;
  }

  const [friendships, requests, blocks] = await Promise.all([
    safeFindMany(
      db.friendship.findMany({
        where: {
          OR: [
            { userAId: viewerId, userBId: { in: otherTargetIds } },
            { userBId: viewerId, userAId: { in: otherTargetIds } }
          ]
        },
        select: {
          userAId: true,
          userBId: true
        }
      })
    ),
    safeFindMany(
      db.friendRequest.findMany({
        where: {
          OR: [
            {
              fromUserId: viewerId,
              toUserId: {
                in: otherTargetIds
              }
            },
            {
              toUserId: viewerId,
              fromUserId: {
                in: otherTargetIds
              }
            }
          ]
        },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          fromUserId: true,
          toUserId: true,
          status: true,
          createdAt: true,
          updatedAt: true
        }
      })
    ),
    safeFindMany(
      db.block.findMany({
        where: {
          OR: [
            {
              blockerId: viewerId,
              blockedId: {
                in: otherTargetIds
              }
            },
            {
              blockedId: viewerId,
              blockerId: {
                in: otherTargetIds
              }
            }
          ]
        },
        select: {
          blockerId: true,
          blockedId: true
        }
      })
    )
  ]);

  const blockedTargetIds = new Set(
    blocks
      .map((block) => getCounterpartyId(viewerId, block))
      .filter((id): id is string => Boolean(id))
  );
  const friendTargetIds = new Set(
    friendships
      .map((friendship) => getCounterpartyId(viewerId, friendship))
      .filter((id): id is string => Boolean(id))
  );
  const incomingPendingByTargetId = new Map<string, string>();
  const outgoingPendingByTargetId = new Map<string, string>();

  for (const request of requests) {
    const targetUserId = getCounterpartyId(viewerId, request);

    if (!targetUserId) {
      continue;
    }

    if (request.status === "ACCEPTED") {
      friendTargetIds.add(targetUserId);
      continue;
    }

    if (request.status !== "PENDING") {
      continue;
    }

    if (request.toUserId === viewerId && !incomingPendingByTargetId.has(targetUserId)) {
      incomingPendingByTargetId.set(targetUserId, request.id);
      continue;
    }

    if (request.fromUserId === viewerId && !outgoingPendingByTargetId.has(targetUserId)) {
      outgoingPendingByTargetId.set(targetUserId, request.id);
    }
  }

  for (const targetUserId of otherTargetIds) {
    const base = relationshipNone(targetUserId);
    const isBlocked = blockedTargetIds.has(targetUserId);
    const isFriend = friendTargetIds.has(targetUserId);
    const incomingRequestId = incomingPendingByTargetId.get(targetUserId) ?? null;
    const outgoingRequestId = outgoingPendingByTargetId.get(targetUserId) ?? null;
    let status: RelationshipStatus = "none";

    if (isBlocked) {
      status = "blocked";
    } else if (isFriend) {
      status = "friends";
    } else if (incomingRequestId) {
      status = "pending_received";
    } else if (outgoingRequestId) {
      status = "pending_sent";
    }

    detailsByTargetId.set(targetUserId, {
      ...base,
      status,
      isBlocked,
      isFriend,
      incomingRequestId,
      outgoingRequestId,
      activeRequestId: incomingRequestId ?? outgoingRequestId
    });
  }

  return detailsByTargetId;
}

export async function getRelationshipDetails(
  viewerId: string,
  targetUserId: string,
  options?: {
    db?: RelationshipDb;
  }
) {
  const detailsByTargetId = await getRelationshipDetailsForTargets(viewerId, [targetUserId], options);
  return detailsByTargetId.get(targetUserId) ?? relationshipNone(targetUserId);
}

export async function getPairFriendships(
  viewerId: string,
  targetUserId: string,
  options?: {
    db?: RelationshipDb;
  }
) {
  const db = options?.db ?? prisma;
  const normalizedPair = normalizeFriendPair(viewerId, targetUserId);

  return safeFindMany(
    db.friendship.findMany({
      where: {
        OR: [
          normalizedPair,
          {
            userAId: normalizedPair.userBId,
            userBId: normalizedPair.userAId
          }
        ]
      },
      select: {
        userAId: true,
        userBId: true
      }
    })
  ) as Promise<MinimalFriendship[]>;
}

export async function getPairFriendRequests(
  viewerId: string,
  targetUserId: string,
  options?: {
    db?: RelationshipDb;
  }
) {
  const db = options?.db ?? prisma;

  return safeFindMany(
    db.friendRequest.findMany({
      where: {
        OR: [
          { fromUserId: viewerId, toUserId: targetUserId },
          { fromUserId: targetUserId, toUserId: viewerId }
        ]
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        fromUserId: true,
        toUserId: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    })
  ) as Promise<MinimalFriendRequest[]>;
}

export async function getPairBlocks(
  viewerId: string,
  targetUserId: string,
  options?: {
    db?: RelationshipDb;
  }
) {
  const db = options?.db ?? prisma;

  return safeFindMany(
    db.block.findMany({
      where: {
        OR: [
          {
            blockerId: viewerId,
            blockedId: targetUserId
          },
          {
            blockerId: targetUserId,
            blockedId: viewerId
          }
        ]
      },
      select: {
        blockerId: true,
        blockedId: true
      }
    })
  ) as Promise<MinimalBlock[]>;
}
