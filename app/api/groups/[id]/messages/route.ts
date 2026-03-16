import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { z } from "zod";
import { getGroupConversation } from "@/lib/data";

export const runtime = "nodejs";

const createMessageSchema = z.object({
  content: z.string().min(1).max(2500),
});

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const userId = session.user.id;
  const groupId = params.id;
  const result = await getGroupConversation(userId, groupId);

  if (result.status === "not_found") {
    return apiError("Group not found", 404);
  }

  if (result.status === "forbidden") {
    return apiError("Forbidden", 403);
  }

  return Response.json({ messages: result.messages });
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const userId = session.user.id;
  const groupId = params.id;

  // Check membership
  const member = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: {
        groupId,
        userId
      }
    }
  });

  if (!member) {
    return apiError("Forbidden", 403);
  }

  try {
    const json = await request.json();
    const { content } = createMessageSchema.parse(json);

    const message = await prisma.groupMessage.create({
      data: {
        groupId,
        userId,
        content
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true
          }
        }
      }
    });

    // Optionally update group updatedAt
    await prisma.group.update({
      where: { id: groupId },
      data: { updatedAt: new Date() }
    });

    return Response.json({ message });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Invalid request data", 400);
    }
    console.error("Send message error:", error);
    return apiError("Failed to send message", 500);
  }
}
