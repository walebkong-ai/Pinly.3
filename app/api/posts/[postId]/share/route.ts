import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { z } from "zod";
import { getVisiblePostById } from "@/lib/data";

export const runtime = "nodejs";

const sharePostSchema = z.object({
  groupIds: z.array(z.string()).min(1),
});

export async function POST(request: Request, props: { params: Promise<{ postId: string }> }) {
  const params = await props.params;
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const userId = session.user.id;
  const postId = params.postId;

  try {
    const json = await request.json();
    const { groupIds } = sharePostSchema.parse(json);

    // 1. Verify the user has access to view this post (respecting private profiles / friendships)
    const post = await getVisiblePostById(userId, postId);

    if (!post) {
      return apiError("Post not found or you do not have permission to share it.", 404);
    }

    // 2. Verify the user is actually a member of ALL the requested groups
    const memberships = await prisma.groupMember.findMany({
      where: {
        userId,
        groupId: { in: groupIds },
      },
    });

    if (memberships.length !== groupIds.length) {
      return apiError("You are not a member of one or more selected groups.", 403);
    }

    // 3. Inject the payload into the group chats
    const payloadContent = `[SHARED_POST]:${postId}`;

    // Use a transaction to create all messages and update all group updatedAt timestamps simultaneously
    await prisma.$transaction(async (tx) => {
      // Create message for each group
      await Promise.all(
        groupIds.map((groupId) =>
          tx.groupMessage.create({
            data: {
              groupId,
              userId,
              content: payloadContent,
            },
          })
        )
      );

      // Bump the updatedAt on the groups so they bubble up in the list
      await tx.group.updateMany({
        where: { id: { in: groupIds } },
        data: { updatedAt: new Date() },
      });
    });

    return Response.json({ success: true, message: "Post shared successfully." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Invalid request data. Must provide an array of groupIds.", 400);
    }
    console.error("Share post error:", error);
    return apiError("Failed to share post.", 500);
  }
}
