import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeUsername } from "@/lib/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Atomically remove friendship/requests and create the block
    await prisma.$transaction([
      prisma.friendship.deleteMany({
        where: {
          OR: [
            { userAId: currentUserId, userBId: targetUserId },
            { userAId: targetUserId, userBId: currentUserId },
          ],
        },
      }),
      prisma.friendRequest.deleteMany({
        where: {
          OR: [
            { fromUserId: currentUserId, toUserId: targetUserId },
            { fromUserId: targetUserId, toUserId: currentUserId },
          ],
        },
      }),
      prisma.block.create({
        data: {
          blockerId: currentUserId,
          blockedId: targetUserId,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    // Unique constraint violation (P2002) means they are already blocked
    if (error.code === 'P2002') {
      return NextResponse.json({ success: true });
    }
    
    console.error("Error blocking user:", error);
    return NextResponse.json(
      { error: "Could not block user" },
      { status: 500 }
    );
  }
}
