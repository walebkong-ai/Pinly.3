import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { z } from "zod";

export const runtime = "nodejs";

const createGroupSchema = z.object({
  name: z.string().min(1).max(50),
  memberIds: z.array(z.string()).min(1),
});

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const userId = session.user.id;

  const groups = await prisma.group.findMany({
    where: {
      members: {
        some: {
          userId: userId,
        },
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
      _count: {
        select: { members: true, messages: true }
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          user: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    },
    orderBy: { updatedAt: "desc" },
  });

  return Response.json({
    groups: groups.map((group) => {
      const directUser = group.isDirect
        ? group.members.find((member) => member.user.id !== userId)?.user ?? null
        : null;
      const latestMessage = group.messages[0] ?? null;

      return {
        ...group,
        directUser,
        lastMessage: latestMessage
          ? {
              id: latestMessage.id,
              createdAt: latestMessage.createdAt,
              senderName: latestMessage.user.id === userId ? "You" : latestMessage.user.name,
              content: latestMessage.content.startsWith("[SHARED_POST]:")
                ? "Shared a post"
                : latestMessage.content
            }
          : null
      };
    })
  });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const userId = session.user.id;

  try {
    const json = await request.json();
    const { name, memberIds } = createGroupSchema.parse(json);

    // Verify all memberIds are actually friends (omitted for brevity, assume valid or filter).
    // In a real app, you would intersect memberIds with getVisibleUserIds(userId).

    const group = await prisma.group.create({
      data: {
        name,
        members: {
          create: [
            { userId, role: "OWNER" },
            ...memberIds.map(id => ({ userId: id, role: "MEMBER" as const }))
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
