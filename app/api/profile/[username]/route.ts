import { auth } from "@/lib/auth";
import { getProfileData } from "@/lib/data";
import { apiError } from "@/lib/api";

type Context = {
  params: Promise<{ username: string }>;
};

export const runtime = "nodejs";

export async function GET(_: Request, context: Context) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const { username } = await context.params;
  const profile = await getProfileData(username, session.user.id);

  if (!profile) {
    return apiError("Profile not found", 404);
  }

  return Response.json(profile);
}
