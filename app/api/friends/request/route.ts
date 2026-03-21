import { auth } from "@/lib/auth";
import { normalizeFriendPair } from "@/lib/friendships";
import { getRelationshipDetails } from "@/lib/relationships";
import { createNotificationSafely } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { friendRequestSchema, normalizeUsername } from "@/lib/validation";
import { apiError, apiValidationError } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON payload.", 400, { code: "FRIEND_REQUEST_INVALID_JSON" });
  }

  const parsed = friendRequestSchema.safeParse(body);

  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  const normalizedUsername = normalizeUsername(parsed.data.username);
  const target = await prisma.user.findUnique({
    where: { username: normalizedUsername }
  });

  if (!target) {
    return apiError("User not found", 404);
  }

  if (target.id === session.user.id) {
    return apiError("You cannot friend yourself.", 400);
  }

  const pair = normalizeFriendPair(session.user.id, target.id);
  const result = await prisma.$transaction(async (tx) => {
    const relationship = await getRelationshipDetails(session.user.id, target.id, { db: tx });

    if (relationship.status === "blocked") {
      return { kind: "blocked" } as const;
    }

    if (relationship.status === "friends") {
      await tx.friendship.upsert({
        where: { userAId_userBId: pair },
        create: pair,
        update: {}
      });
      await tx.friendship.deleteMany({
        where: {
          userAId: pair.userBId,
          userBId: pair.userAId
        }
      });

      return { kind: "friends" } as const;
    }

    if (relationship.status === "pending_received" && relationship.incomingRequestId) {
      await tx.friendRequest.updateMany({
        where: {
          OR: [
            { fromUserId: session.user.id, toUserId: target.id },
            { fromUserId: target.id, toUserId: session.user.id }
          ],
          status: "PENDING"
        },
        data: {
          status: "ACCEPTED"
        }
      });
      await tx.friendship.upsert({
        where: { userAId_userBId: pair },
        create: pair,
        update: {}
      });
      await tx.friendship.deleteMany({
        where: {
          userAId: pair.userBId,
          userBId: pair.userAId
        }
      });

      return {
        kind: "autoAccepted",
        requestId: relationship.incomingRequestId
      } as const;
    }

    if (relationship.status === "pending_sent") {
      return { kind: "pending" } as const;
    }

    const friendRequest = await tx.friendRequest.upsert({
      where: {
        fromUserId_toUserId: {
          fromUserId: session.user.id,
          toUserId: target.id
        }
      },
      update: {
        status: "PENDING"
      },
      create: {
        fromUserId: session.user.id,
        toUserId: target.id
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
      }
    });

    return {
      kind: "sent",
      friendRequest
    } as const;
  });

  if (result.kind === "blocked") {
    return apiError("You can't send requests between blocked users.", 403);
  }

  if (result.kind === "friends") {
    return apiError("You are already friends.", 409);
  }

  if (result.kind === "pending") {
    return apiError("A friend request is already pending.", 409);
  }

  if (result.kind === "autoAccepted") {
    await createNotificationSafely({
      userId: target.id,
      actorId: session.user.id,
      type: "FRIEND_REQUEST_ACCEPTED",
      friendRequestId: result.requestId,
      dedupeKey: `FRIEND_REQUEST_ACCEPTED:${result.requestId}`
    });

    return Response.json({ autoAccepted: true, relationshipStatus: "friends" }, { status: 201 });
  }

  await createNotificationSafely({
    userId: target.id,
    actorId: session.user.id,
    type: "FRIEND_REQUEST_RECEIVED",
    friendRequestId: result.friendRequest.id,
    dedupeKey: `FRIEND_REQUEST_RECEIVED:${result.friendRequest.id}`
  });

  return Response.json(
    {
      friendRequest: result.friendRequest,
      relationshipStatus: "pending_sent"
    },
    { status: 201 }
  );
}
