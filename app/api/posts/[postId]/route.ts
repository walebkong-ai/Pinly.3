import { auth } from "@/lib/auth";
import { getVisiblePostById } from "@/lib/data";
import { apiError } from "@/lib/api";

type Context = {
  params: Promise<{ postId: string }>;
};

export const runtime = "nodejs";

export async function GET(_: Request, context: Context) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const { postId } = await context.params;
  const post = await getVisiblePostById(session.user.id, postId);

  if (!post) {
    return apiError("Post not found", 404);
  }

  return Response.json({ post });
}
