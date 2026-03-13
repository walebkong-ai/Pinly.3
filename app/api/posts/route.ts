import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mapQuerySchema, postSchema } from "@/lib/validation";
import { apiError, apiValidationError } from "@/lib/api";
import { getMapData } from "@/lib/data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const parsed = mapQuerySchema.safeParse({
    north: searchParams.get("north"),
    south: searchParams.get("south"),
    east: searchParams.get("east"),
    west: searchParams.get("west"),
    zoom: searchParams.get("zoom"),
    q: searchParams.get("q") ?? undefined,
    layer: searchParams.get("layer") ?? undefined,
    time: searchParams.get("time") ?? undefined,
    groups: searchParams.get("groups") ?? undefined,
    categories: searchParams.get("categories") ?? undefined
  });

  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  const map = await getMapData({
    viewerId: session.user.id,
    bounds: parsed.data,
    zoom: parsed.data.zoom,
    layer: parsed.data.layer,
    time: parsed.data.time,
    groups: parsed.data.groups,
    categories: parsed.data.categories,
    query: parsed.data.q
  });

  return Response.json(map);
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON payload.", 400, { code: "POST_INVALID_JSON" });
  }

  const parsed = postSchema.safeParse(body);

  if (!parsed.success) {
    return apiValidationError(parsed.error);
  }

  try {
    const post = await prisma.post.create({
      data: {
        ...parsed.data,
        visitedAt: new Date(parsed.data.visitedAt),
        userId: session.user.id
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

    return Response.json({ post }, { status: 201 });
  } catch (error) {
    return apiError("Could not save this memory post.", 500, {
      code: "POST_CREATE_FAILED",
      details: error instanceof Error ? error.message : "Unknown post creation failure"
    });
  }
}
