import { auth } from "@/lib/auth";
import { normalizeFriendPair } from "@/lib/friendships";
import { prisma } from "@/lib/prisma";
import { friendRequestActionSchema } from "@/lib/validation";
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
    await prisma.friendship.create({
      data: normalizeFriendPair(friendRequest.fromUserId, friendRequest.toUserId)
    });
  }

  return Response.json({ ok: true });
}
