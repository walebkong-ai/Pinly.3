import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const userId = session.user.id;
  const groupId = params.id;

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
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
      }
    }
  });

  if (!group) {
    return apiError("Group not found", 404);
  }

  const isMember = group.members.some((m: { userId: string }) => m.userId === userId);
  if (!isMember) {
    return apiError("Forbidden", 403);
  }

  return Response.json({ group });
}
