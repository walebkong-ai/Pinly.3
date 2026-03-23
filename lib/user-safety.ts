import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPrismaSchemaNotReadyError } from "@/lib/prisma-errors";

type SafetyDb = PrismaClient | Prisma.TransactionClient;

function resolveDb(options?: { db?: SafetyDb }) {
  return options?.db ?? prisma;
}

export async function getBlockedUserIdsForViewer(
  viewerId: string,
  options?: { db?: SafetyDb }
) {
  const db = resolveDb(options);

  try {
    const blocks = await db.block.findMany({
      where: {
        OR: [{ blockerId: viewerId }, { blockedId: viewerId }]
      },
      select: {
        blockerId: true,
        blockedId: true
      }
    });

    return new Set(
      blocks.map((block) => (block.blockerId === viewerId ? block.blockedId : block.blockerId))
    );
  } catch (error) {
    if (isPrismaSchemaNotReadyError(error)) {
      return new Set<string>();
    }

    throw error;
  }
}

export async function areUsersBlocked(
  viewerId: string,
  targetUserId: string,
  options?: { db?: SafetyDb }
) {
  if (!viewerId || !targetUserId || viewerId === targetUserId) {
    return false;
  }

  const blockedUserIds = await getBlockedUserIdsForViewer(viewerId, options);
  return blockedUserIds.has(targetUserId);
}
