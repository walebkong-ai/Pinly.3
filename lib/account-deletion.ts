import type { GroupRole, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isReservedDemoEmail } from "@/lib/demo-config";
import { shouldProxyMediaUrl } from "@/lib/media-url";

type AccountDeletionRunner = Pick<PrismaClient, "$transaction">;

type GroupMemberSnapshot = {
  userId: string;
  role: GroupRole;
  joinedAt: Date;
};

type GroupMembershipSnapshot = {
  groupId: string;
  role: GroupRole;
  group: {
    id: string;
    isDirect: boolean;
    members: GroupMemberSnapshot[];
  };
};

type AccountDeletionSnapshot = {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  posts: Array<{
    mediaUrl: string;
    thumbnailUrl: string | null;
  }>;
  groupMembers: GroupMembershipSnapshot[];
  _count: {
    posts: number;
    postCollections: number;
    wantToGoPlaces: number;
    comments: number;
    likes: number;
    savedPosts: number;
    notifications: number;
    actorNotifications: number;
    sentRequests: number;
    receivedRequests: number;
    friendshipsA: number;
    friendshipsB: number;
    groupMessages: number;
    groupMembers: number;
    inviteLinks: number;
    blocksGiven: number;
    blocksReceived: number;
    reportsGiven: number;
    reportsReceived: number;
  };
};

export type AccountDeletionSummary = {
  username: string;
  deletedBlobCount: number;
  blobDeletionFailed: boolean;
  postsDeleted: number;
  collectionsDeleted: number;
  wantToGoPlacesDeleted: number;
  commentsDeleted: number;
  likesDeleted: number;
  savedPostsDeleted: number;
  notificationsDeleted: number;
  friendRequestsDeleted: number;
  friendshipsDeleted: number;
  groupMessagesDeleted: number;
  groupMembershipsRemoved: number;
  directConversationsDeleted: number;
  groupsDeleted: number;
  groupOwnershipTransfers: number;
  blocksDeleted: number;
  reportsDeleted: number;
  inviteLinksDeleted: number;
  passwordResetTokensDeleted: number;
};

export type AccountGroupCleanupPlan = {
  directGroupIds: string[];
  groupsToDelete: string[];
  ownershipTransfers: Array<{
    groupId: string;
    nextOwnerUserId: string;
  }>;
};

export class AccountDeletionNotFoundError extends Error {
  constructor() {
    super("Account not found.");
    this.name = "AccountDeletionNotFoundError";
  }
}

export class DemoAccountDeletionNotAllowedError extends Error {
  constructor() {
    super("Reserved demo accounts cannot be deleted from the app.");
    this.name = "DemoAccountDeletionNotAllowedError";
  }
}

function sortMembersForOwnership(members: GroupMemberSnapshot[]) {
  return [...members].sort((left, right) => {
    if (left.role === "OWNER" && right.role !== "OWNER") {
      return -1;
    }

    if (left.role !== "OWNER" && right.role === "OWNER") {
      return 1;
    }

    const joinedAtDiff = left.joinedAt.getTime() - right.joinedAt.getTime();

    if (joinedAtDiff !== 0) {
      return joinedAtDiff;
    }

    return left.userId.localeCompare(right.userId);
  });
}

export function planAccountGroupCleanup(userId: string, memberships: GroupMembershipSnapshot[]): AccountGroupCleanupPlan {
  const directGroupIds = new Set<string>();
  const groupsToDelete = new Set<string>();
  const ownershipTransfers = new Map<string, string>();

  for (const membership of memberships) {
    if (membership.group.isDirect) {
      directGroupIds.add(membership.groupId);
      continue;
    }

    const remainingMembers = sortMembersForOwnership(
      membership.group.members.filter((member) => member.userId !== userId)
    );

    if (remainingMembers.length === 0) {
      groupsToDelete.add(membership.groupId);
      continue;
    }

    const hasRemainingOwner = remainingMembers.some((member) => member.role === "OWNER");

    if (!hasRemainingOwner) {
      ownershipTransfers.set(membership.groupId, remainingMembers[0].userId);
    }
  }

  return {
    directGroupIds: Array.from(directGroupIds),
    groupsToDelete: Array.from(groupsToDelete),
    ownershipTransfers: Array.from(ownershipTransfers.entries()).map(([groupId, nextOwnerUserId]) => ({
      groupId,
      nextOwnerUserId
    }))
  };
}

export function collectAccountDeletionBlobUrls(snapshot: Pick<AccountDeletionSnapshot, "avatarUrl" | "posts">) {
  return Array.from(
    new Set(
      [snapshot.avatarUrl, ...snapshot.posts.flatMap((post) => [post.mediaUrl, post.thumbnailUrl])]
        .filter((url): url is string => typeof url === "string" && shouldProxyMediaUrl(url))
    )
  );
}

async function deleteBlobUrls(urls: string[]) {
  if (urls.length === 0) {
    return;
  }

  const { del } = await import("@vercel/blob");
  await del(urls);
}

async function readDeletionSnapshot(tx: Prisma.TransactionClient, userId: string) {
  return tx.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      avatarUrl: true,
      posts: {
        select: {
          mediaUrl: true,
          thumbnailUrl: true
        }
      },
      groupMembers: {
        select: {
          groupId: true,
          role: true,
          group: {
            select: {
              id: true,
              isDirect: true,
              members: {
                orderBy: [{ joinedAt: "asc" }, { userId: "asc" }],
                select: {
                  userId: true,
                  role: true,
                  joinedAt: true
                }
              }
            }
          }
        }
      },
      _count: {
        select: {
          posts: true,
          postCollections: true,
          wantToGoPlaces: true,
          comments: true,
          likes: true,
          savedPosts: true,
          notifications: true,
          actorNotifications: true,
          sentRequests: true,
          receivedRequests: true,
          friendshipsA: true,
          friendshipsB: true,
          groupMessages: true,
          groupMembers: true,
          inviteLinks: true,
          blocksGiven: true,
          blocksReceived: true,
          reportsGiven: true,
          reportsReceived: true
        }
      }
    }
  }) as Promise<AccountDeletionSnapshot | null>;
}

export async function deleteAccount(
  userId: string,
  options?: {
    db?: AccountDeletionRunner;
    deleteBlobUrls?: (urls: string[]) => Promise<void>;
  }
): Promise<AccountDeletionSummary> {
  const db = options?.db ?? prisma;
  const deleteBlobUrlsFn = options?.deleteBlobUrls ?? deleteBlobUrls;

  const deletionResult = await db.$transaction(async (tx) => {
    const snapshot = await readDeletionSnapshot(tx, userId);

    if (!snapshot) {
      throw new AccountDeletionNotFoundError();
    }

    if (isReservedDemoEmail(snapshot.email)) {
      throw new DemoAccountDeletionNotAllowedError();
    }

    const plan = planAccountGroupCleanup(snapshot.id, snapshot.groupMembers);
    const blobUrls = collectAccountDeletionBlobUrls(snapshot);
    const passwordResetTokensDeleted = await tx.passwordResetToken.count({
      where: { email: snapshot.email }
    });

    if (plan.directGroupIds.length > 0) {
      await tx.group.deleteMany({
        where: {
          id: { in: plan.directGroupIds }
        }
      });
    }

    if (plan.groupsToDelete.length > 0) {
      await tx.group.deleteMany({
        where: {
          id: { in: plan.groupsToDelete }
        }
      });
    }

    for (const transfer of plan.ownershipTransfers) {
      await tx.groupMember.update({
        where: {
          groupId_userId: {
            groupId: transfer.groupId,
            userId: transfer.nextOwnerUserId
          }
        },
        data: {
          role: "OWNER"
        }
      });
    }

    await tx.passwordResetToken.deleteMany({
      where: { email: snapshot.email }
    });

    await tx.user.delete({
      where: { id: snapshot.id }
    });

    return {
      snapshot,
      plan,
      blobUrls,
      passwordResetTokensDeleted
    };
  });

  let blobDeletionFailed = false;

  try {
    await deleteBlobUrlsFn(deletionResult.blobUrls);
  } catch (error) {
    blobDeletionFailed = true;
    console.error("Blob cleanup failed after account deletion:", error);
  }

  return {
    username: deletionResult.snapshot.username,
    deletedBlobCount: deletionResult.blobUrls.length,
    blobDeletionFailed,
    postsDeleted: deletionResult.snapshot._count.posts,
    collectionsDeleted: deletionResult.snapshot._count.postCollections,
    wantToGoPlacesDeleted: deletionResult.snapshot._count.wantToGoPlaces,
    commentsDeleted: deletionResult.snapshot._count.comments,
    likesDeleted: deletionResult.snapshot._count.likes,
    savedPostsDeleted: deletionResult.snapshot._count.savedPosts,
    notificationsDeleted:
      deletionResult.snapshot._count.notifications + deletionResult.snapshot._count.actorNotifications,
    friendRequestsDeleted:
      deletionResult.snapshot._count.sentRequests + deletionResult.snapshot._count.receivedRequests,
    friendshipsDeleted:
      deletionResult.snapshot._count.friendshipsA + deletionResult.snapshot._count.friendshipsB,
    groupMessagesDeleted: deletionResult.snapshot._count.groupMessages,
    groupMembershipsRemoved: deletionResult.snapshot._count.groupMembers,
    directConversationsDeleted: deletionResult.plan.directGroupIds.length,
    groupsDeleted: deletionResult.plan.groupsToDelete.length,
    groupOwnershipTransfers: deletionResult.plan.ownershipTransfers.length,
    blocksDeleted: deletionResult.snapshot._count.blocksGiven + deletionResult.snapshot._count.blocksReceived,
    reportsDeleted: deletionResult.snapshot._count.reportsGiven + deletionResult.snapshot._count.reportsReceived,
    inviteLinksDeleted: deletionResult.snapshot._count.inviteLinks,
    passwordResetTokensDeleted: deletionResult.passwordResetTokensDeleted
  };
}
