import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeUsername } from "@/lib/validation";
import { enforceRateLimit } from "@/lib/rate-limit";

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
      scope: "user-report",
      request,
      userId: session.user.id,
      limit: 10,
      windowMs: 60 * 60 * 1000
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { username } = await params;
    const currentUserId = session.user.id;
    
    // Parse reason if provided
    let reason = null;
    try {
      const body = await request.json();
      reason = body.reason;
    } catch (e) {
      // Ignored - body is optional
    }

    const targetUser = await prisma.user.findUnique({
      where: { username: normalizeUsername(username) },
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const targetUserId = targetUser.id;

    if (currentUserId === targetUserId) {
      return NextResponse.json({ error: "Cannot report yourself" }, { status: 400 });
    }

    await prisma.report.create({
      data: {
        reporterId: currentUserId,
        reportedId: targetUserId,
        reason: reason || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reporting user:", error);
    return NextResponse.json(
      { error: "Could not submit report" },
      { status: 500 }
    );
  }
}
