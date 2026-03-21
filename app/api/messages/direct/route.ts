import { z } from "zod";
import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getFriendIds } from "@/lib/data";
import { buildDirectPairKey } from "@/lib/friendships";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const openDirectSchema = z.object({
  friendId: z.string().cuid()
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const userId = session.user.id;
  let requestedFriendId: string | null = null;

  const rateLimitResponse = enforceRateLimit({
    scope: "messages-direct-open",
    request,
    userId,
    limit: 30,
    windowMs: 10 * 60 * 1000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const json = await request.json();
    const { friendId } = openDirectSchema.parse(json);
    requestedFriendId = friendId;

    if (friendId === userId) {
      return apiError("You cannot message yourself.", 400);
    }

    const friendIds = await getFriendIds(userId);
    if (!friendIds.includes(friendId)) {
      return apiError("You can only message friends directly.", 403);
    }

    const directPairKey = buildDirectPairKey(userId, friendId);
    const existingConversation = await prisma.group.findUnique({
      where: { directPairKey },
      select: { id: true }
    });

    if (existingConversation) {
      return Response.json({ groupId: existingConversation.id, created: false });
    }

    const users = await prisma.user.findMany({
      where: { id: { in: [userId, friendId] } },
      select: {
        id: true,
        name: true
      }
    });

    const currentUser = users.find((user) => user.id === userId);
    const friendUser = users.find((user) => user.id === friendId);

    if (!currentUser || !friendUser) {
      return apiError("Friend not found.", 404);
    }

    const group = await prisma.group.create({
      data: {
        name: [currentUser.name, friendUser.name].sort((left, right) => left.localeCompare(right)).join(" & "),
        isDirect: true,
        directPairKey,
        members: {
          create: [
            { userId, role: "OWNER" },
            { userId: friendId, role: "MEMBER" }
          ]
        }
      },
      select: {
        id: true
      }
    });

    return Response.json({ groupId: group.id, created: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Invalid request data.", 400);
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      if (requestedFriendId) {
        const existingConversation = await prisma.group.findUnique({
          where: { directPairKey: buildDirectPairKey(userId, requestedFriendId) },
          select: { id: true }
        });

        if (existingConversation) {
          return Response.json({ groupId: existingConversation.id, created: false });
        }
      }
    }

    console.error("Open direct conversation error:", error);
    return apiError("Failed to open direct message.", 500);
  }
}
