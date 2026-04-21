import { auth } from "@/lib/auth";
import { normalizeFriendPair } from "@/lib/friendships";
import { createNotificationSafely } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { friendRequestActionSchema } from "@/lib/validation";
import { apiError, apiValidationError, readJsonBody, toApiErrorResponse } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const rateLimitResponse = await enforceRateLimit({
    scope: "friend-request-respond",
    request,
    userId: session.user.id,
    limit: 30,
    windowMs: 10 * 60 * 1000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let body: unknown;

  try {
    body = await readJsonBody(request, {
      maxBytes: 4 * 1024,
      invalidJsonCode: "FRIEND_RESPONSE_INVALID_JSON",
      invalidJsonMessage: "Invalid JSON payload."
    });
  } catch (error) {
    return toApiErrorResponse(error);
  }

  const parsed = friendRequestActionSchema.safeParse(body);

  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  const result = await prisma.$transaction(async (tx) => {
    const friendRequest = await tx.friendRequest.findUnique({
      where: { id: parsed.data.requestId }
    });

    if (!friendRequest || friendRequest.toUserId !== session.user.id) {
      return { kind: "not_found" } as const;
    }

    if (parsed.data.action === "accept") {
      const normalizedPair = normalizeFriendPair(friendRequest.fromUserId, friendRequest.toUserId);

      if (friendRequest.status === "DECLINED") {
        return { kind: "already_declined" } as const;
      }

      await tx.friendRequest.updateMany({
        where: {
          OR: [
            { fromUserId: friendRequest.fromUserId, toUserId: friendRequest.toUserId },
            { fromUserId: friendRequest.toUserId, toUserId: friendRequest.fromUserId }
          ],
          status: "PENDING"
        },
        data: {
          status: "ACCEPTED"
        }
      });
      await tx.friendship.upsert({
        where: {
          userAId_userBId: normalizedPair
        },
        create: normalizedPair,
        update: {}
      });
      await tx.friendship.deleteMany({
        where: {
          userAId: normalizedPair.userBId,
          userBId: normalizedPair.userAId
        }
      });

      return {
        kind: "accepted",
        requestId: friendRequest.id,
        fromUserId: friendRequest.fromUserId,
        alreadyHandled: friendRequest.status === "ACCEPTED"
      } as const;
    }

    if (friendRequest.status === "ACCEPTED") {
      return { kind: "already_accepted" } as const;
    }

    await tx.friendRequest.updateMany({
      where: {
        OR: [
          { fromUserId: friendRequest.fromUserId, toUserId: friendRequest.toUserId },
          { fromUserId: friendRequest.toUserId, toUserId: friendRequest.fromUserId }
        ],
        status: "PENDING"
      },
      data: {
        status: "DECLINED"
      }
    });

    return {
      kind: "declined"
    } as const;
  });

  if (result.kind === "not_found") {
    return apiError("Friend request not found.", 404);
  }

  if (result.kind === "already_declined") {
    return apiError("This friend request has already been declined.", 409);
  }

  if (result.kind === "already_accepted") {
    return apiError("This friend request has already been accepted.", 409);
  }

  if (result.kind === "accepted") {
    if (!result.alreadyHandled) {
      await createNotificationSafely({
        userId: result.fromUserId,
        actorId: session.user.id,
        type: "FRIEND_REQUEST_ACCEPTED",
        friendRequestId: result.requestId,
        dedupeKey: `FRIEND_REQUEST_ACCEPTED:${result.requestId}`
      });
    }

    return Response.json({ ok: true, relationshipStatus: "friends" });
  }

  return Response.json({ ok: true, relationshipStatus: "none" });
}
