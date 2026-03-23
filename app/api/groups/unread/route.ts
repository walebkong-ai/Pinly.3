import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { getUnreadGroupMessageCount } from "@/lib/data";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const userId = session.user.id;
  return Response.json({ unreadCount: await getUnreadGroupMessageCount(userId) });
}
