import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { z } from "zod";
import { getFriendIds, getMessageGroups } from "@/lib/data";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const createGroupSchema = z.object({
  name: z.string().min(1).max(50),
  memberIds: z.array(z.string().cuid()).min(1),
});

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  return Response.json({
    groups: await getMessageGroups(session.user.id)
  });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const userId = session.user.id;

  const rateLimitResponse = await enforceRateLimit({
    scope: "groups-create",
    request,
    userId,
    limit: 10,
    windowMs: 10 * 60 * 1000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const json = await request.json();
    const { name, memberIds } = createGroupSchema.parse(json);
    const requestedMemberIds = Array.from(new Set(memberIds)).filter((memberId) => memberId !== userId);
    const friendIds = await getFriendIds(userId);

    if (requestedMemberIds.length === 0) {
      return apiError("Select at least one friend to start a group.", 400);
    }

    if (requestedMemberIds.some((memberId) => !friendIds.includes(memberId))) {
      return apiError("Groups can only include your friends.", 403);
    }

    const group = await prisma.group.create({
      data: {
        name,
        members: {
          create: [
            { userId, role: "OWNER" },
            ...requestedMemberIds.map(id => ({ userId: id, role: "MEMBER" as const }))
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return Response.json({ group });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Invalid request data", 400);
    }
    console.error("Group creation error:", error);
    return apiError("Failed to create group", 500);
  }
}
