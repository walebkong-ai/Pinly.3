import { auth } from "@/lib/auth";
import { normalizeFriendPair } from "@/lib/friendships";
import { createNotificationSafely } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { friendRequestActionSchema } from "@/lib/validation";
import { apiError, apiValidationError } from "@/lib/api";
import { getPrismaErrorCode } from "@/lib/prisma-errors";

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
    return apiError("Invalid JSON payload.", 400, { code: "FRIEND_RESPONSE_INVALID_JSON" });
  }

  const parsed = friendRequestActionSchema.safeParse(body);

  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  const friendRequest = await prisma.friendRequest.findUnique({
    where: { id: parsed.data.requestId }
  });

  if (!friendRequest || friendRequest.toUserId !== session.user.id) {
    return apiError("Friend request not found.", 404);
  }

  if (friendRequest.status !== "PENDING") {
    return apiError("This friend request has already been handled.", 409);
  }

  const status = parsed.data.action === "accept" ? "ACCEPTED" : "DECLINED";

  await prisma.friendRequest.update({
    where: { id: friendRequest.id },
    data: { status }
  });

  if (status === "ACCEPTED") {
    try {
      await prisma.friendship.create({
        data: normalizeFriendPair(friendRequest.fromUserId, friendRequest.toUserId)
      });
    } catch (error) {
      if (getPrismaErrorCode(error) !== "P2002") {
        throw error;
      }
    }

    await createNotificationSafely({
      userId: friendRequest.fromUserId,
      actorId: session.user.id,
      type: "FRIEND_REQUEST_ACCEPTED",
      friendRequestId: friendRequest.id,
      dedupeKey: `FRIEND_REQUEST_ACCEPTED:${friendRequest.id}`
    });
  }

  return Response.json({ ok: true });
}
