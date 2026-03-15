import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { z } from "zod";
import { getFriendIds, getVisiblePostById } from "@/lib/data";
import { buildDirectPairKey } from "@/lib/friendships";
import { createNotificationSafely } from "@/lib/notifications";

export const runtime = "nodejs";

const sharePostSchema = z.object({
  groupIds: z.array(z.string().cuid()).default([]),
  userIds: z.array(z.string().cuid()).default([])
}).refine((value) => value.groupIds.length > 0 || value.userIds.length > 0, {
  message: "Must provide at least one share target."
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
    const parsed = sharePostSchema.parse(json);
    const groupIds = Array.from(new Set(parsed.groupIds));
    const userIds = Array.from(new Set(parsed.userIds));

    // 1. Verify the user has access to view this post (respecting private profiles / friendships)
    const post = await getVisiblePostById(userId, postId);

    if (!post) {
      return apiError("Post not found or you do not have permission to share it.", 404);
    }

    // 2. Verify the user is actually a member of ALL the requested groups
    if (groupIds.length > 0) {
      const memberships = await prisma.groupMember.findMany({
        where: {
          userId,
          groupId: { in: groupIds }
        }
      });

      if (memberships.length !== groupIds.length) {
        return apiError("You are not a member of one or more selected groups.", 403);
      }
    }

    if (userIds.some((targetUserId) => targetUserId === userId)) {
      return apiError("You cannot share a post with yourself.", 400);
    }

    const friendIds = userIds.length > 0 ? await getFriendIds(userId) : [];
    if (userIds.some((targetUserId) => !friendIds.includes(targetUserId))) {
      return apiError("You can only share directly with friends.", 403);
    }

    // 3. Inject the payload into the group chats
    const payloadContent = `[SHARED_POST]:${postId}`;
    const targetUsers = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: [userId, ...userIds] } },
          select: { id: true, name: true }
        })
      : [];
    const userMap = new Map(targetUsers.map((target) => [target.id, target]));
    const currentUser = userMap.get(userId);

    if (userIds.length > 0 && (!currentUser || userIds.some((targetUserId) => !userMap.has(targetUserId)))) {
      return apiError("One or more people could not be found.", 404);
    }

    // Use a transaction to create all messages and update all group updatedAt timestamps simultaneously
    await prisma.$transaction(async (tx) => {
      if (groupIds.length > 0) {
        await Promise.all(
          groupIds.map((groupId) =>
            tx.groupMessage.create({
              data: {
                groupId,
                userId,
                content: payloadContent
              }
            })
          )
        );

        await tx.group.updateMany({
          where: { id: { in: groupIds } },
          data: { updatedAt: new Date() }
        });
      }

      for (const targetUserId of userIds) {
        const targetUser = userMap.get(targetUserId);

        if (!targetUser || !currentUser) {
          continue;
        }

        const directGroup = await tx.group.upsert({
          where: {
            directPairKey: buildDirectPairKey(userId, targetUserId)
          },
          update: {
            updatedAt: new Date(),
            isDirect: true
          },
          create: {
            name: [currentUser.name, targetUser.name].sort((left, right) => left.localeCompare(right)).join(" & "),
            isDirect: true,
            directPairKey: buildDirectPairKey(userId, targetUserId),
            members: {
              create: [
                { userId, role: "OWNER" },
                { userId: targetUserId, role: "MEMBER" }
              ]
            }
          },
          select: {
            id: true
          }
        });

        await tx.groupMessage.create({
          data: {
            groupId: directGroup.id,
            userId,
            content: payloadContent
          }
        });
      }
    });

    await createNotificationSafely({
      userId: post.userId,
      actorId: userId,
      type: "POST_SHARED",
      postId,
      friendRequestId: null
    });

    return Response.json({ success: true, message: "Post shared successfully." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError("Invalid request data. Provide valid share targets.", 400);
    }
    console.error("Share post error:", error);
    return apiError("Failed to share post.", 500);
  }
}
