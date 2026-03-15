import { auth } from "@/lib/auth";
import { normalizeFriendPair } from "@/lib/friendships";
import { createNotificationSafely } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { friendRequestSchema } from "@/lib/validation";
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

  const target = await prisma.user.findUnique({
    where: { username: parsed.data.username.toLowerCase() }
  });

  if (!target) {
    return apiError("User not found", 404);
  }

  if (target.id === session.user.id) {
    return apiError("You cannot friend yourself.", 400);
  }

  const pair = normalizeFriendPair(session.user.id, target.id);
  const existingFriendship = await prisma.friendship.findUnique({
    where: { userAId_userBId: pair }
  });

  if (existingFriendship) {
    return apiError("You are already friends.", 409);
  }

  const existingRequest = await prisma.friendRequest.findFirst({
    where: {
      OR: [
        { fromUserId: session.user.id, toUserId: target.id },
        { fromUserId: target.id, toUserId: session.user.id }
      ]
    }
  });

  if (existingRequest?.status === "PENDING") {
    return apiError("A friend request is already pending.", 409);
  }

  const friendRequest =
    existingRequest?.fromUserId === session.user.id && existingRequest.toUserId === target.id
      ? await prisma.friendRequest.update({
          where: { id: existingRequest.id },
          data: { status: "PENDING" },
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
        })
      : await prisma.friendRequest.create({
          data: {
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

  await createNotificationSafely({
    userId: target.id,
    actorId: session.user.id,
    type: "FRIEND_REQUEST_RECEIVED",
    friendRequestId: friendRequest.id,
    dedupeKey: `FRIEND_REQUEST_RECEIVED:${friendRequest.id}`
  });

  return Response.json({ friendRequest }, { status: 201 });
}
