import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { z } from "zod";

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

  await prisma.groupMember.update({
    where: { groupId_userId: { groupId, userId } },
    data: { lastReadAt: new Date() }
  });

  const messages = await prisma.groupMessage.findMany({
    where: { groupId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          avatarUrl: true
        }
      }
    },
    orderBy: { createdAt: "asc" }
  });

  // Hydrate shared posts if they exist and the user has permission to see them
  // We do this manually to enforce the visibility rules from `getVisiblePostById`
  const { getVisiblePostById } = await import("@/lib/data");
  
  const hydratedMessages = await Promise.all(messages.map(async (msg) => {
    if (msg.content.startsWith("[SHARED_POST]:")) {
      const postId = msg.content.replace("[SHARED_POST]:", "");
      const post = await getVisiblePostById(userId, postId);
      
      return {
        ...msg,
        sharedPost: post ? {
          id: post.id,
          placeName: post.placeName,
          city: post.city,
          country: post.country,
          thumbnailUrl: post.thumbnailUrl || post.mediaUrl,
        } : null // If null, the user doesn't have access or it was deleted
      };
    }
    return msg;
  }));

  return Response.json({ messages: hydratedMessages });
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
