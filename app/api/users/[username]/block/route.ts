import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeUsername } from "@/lib/validation";
import { enforceRateLimit } from "@/lib/rate-limit";
import { buildDirectPairKey } from "@/lib/friendships";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await enforceRateLimit({
      scope: "user-block",
      request,
      userId: session.user.id,
      limit: 20,
      windowMs: 60 * 60 * 1000
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { username } = await params;
    const currentUserId = session.user.id;

    const targetUser = await prisma.user.findUnique({
      where: { username: normalizeUsername(username) },
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const targetUserId = targetUser.id;

    if (currentUserId === targetUserId) {
      return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 });
    }

    const directPairKey = buildDirectPairKey(currentUserId, targetUserId);

    await prisma.$transaction(async (tx) => {
      await Promise.all([
        tx.friendship.deleteMany({
          where: {
            OR: [
              { userAId: currentUserId, userBId: targetUserId },
              { userAId: targetUserId, userBId: currentUserId }
            ]
          }
        }),
        tx.friendRequest.deleteMany({
          where: {
            OR: [
              { fromUserId: currentUserId, toUserId: targetUserId },
              { fromUserId: targetUserId, toUserId: currentUserId }
            ]
          }
        }),
        tx.group.deleteMany({
          where: {
            isDirect: true,
            directPairKey
          }
        }),
        tx.block.upsert({
          where: {
            blockerId_blockedId: {
              blockerId: currentUserId,
              blockedId: targetUserId
            }
          },
          update: {},
          create: {
            blockerId: currentUserId,
            blockedId: targetUserId
          }
        })
      ]);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error blocking user:", error);
    return NextResponse.json(
      { error: "Could not block user" },
      { status: 500 }
    );
  }
}
