import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { z } from "zod";

export const runtime = "nodejs";

const addMembersSchema = z.object({
  userIds: z.array(z.string().cuid()).min(1)
});

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const userId = session.user.id;
  const groupId = params.id;

  const parsed = addMembersSchema.safeParse(await request.json());
  if (!parsed.success) {
    return apiError("Invalid member data.", 400);
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: true }
  });

  if (!group) {
    return apiError("Group not found", 404);
  }

  const isMember = group.members.some((m: { userId: string }) => m.userId === userId);
  if (!isMember) {
    return apiError("Forbidden", 403);
  }

  if (group.isDirect) {
    return apiError("Direct conversations cannot be expanded into groups.", 400);
  }

  const existingMemberIds = new Set(group.members.map((m: { userId: string }) => m.userId));
  const newMembers = parsed.data.userIds.filter(id => !existingMemberIds.has(id));

  if (newMembers.length > 0) {
    await prisma.groupMember.createMany({
      data: newMembers.map(newUserId => ({
        groupId,
        userId: newUserId,
        role: "MEMBER"
      })),
      skipDuplicates: true
    });
  }

  return Response.json({ success: true, addedCount: newMembers.length });
}
