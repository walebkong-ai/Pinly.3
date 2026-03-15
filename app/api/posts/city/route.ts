import { auth } from "@/lib/auth";
import { getCityData } from "@/lib/data";
import { cityQuerySchema } from "@/lib/validation";
import { apiError, apiValidationError } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const parsed = cityQuerySchema.safeParse({
    city: searchParams.get("city"),
    country: searchParams.get("country") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined
  });

  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  const result = await getCityData({
    viewerId: session.user.id,
    city: parsed.data.city,
    country: parsed.data.country,
    page: parsed.data.page,
    pageSize: parsed.data.pageSize
  });

  return Response.json({
    city: result.city,
    country: result.country,
    friendCount: result.friendCount,
    postCount: result.postCount,
    center: result.center,
    visitors: result.visitors,
    recentTrips: result.recentTrips,
    posts: result.posts
  });
}
