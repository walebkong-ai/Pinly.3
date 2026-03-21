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

    if (targetUserId === currentUserId) {
      return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
    }

    // Delete any friendship and requests between the two users atomically
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
    ]);

    return NextResponse.json({ success: true, relationshipStatus: "none" });
  } catch (error) {
    console.error("Error removing friend:", error);
    return NextResponse.json(
      { error: "Could not remove friend" },
      { status: 500 }
    );
  }
}
