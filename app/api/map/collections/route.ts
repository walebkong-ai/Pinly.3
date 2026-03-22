import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { getMapCollectionOverlays } from "@/lib/data";
import type { TimeFilter } from "@/types/app";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

function parseLayer(value: string | null) {
  if (value === "friends" || value === "you" || value === "both") {
    return value;
  }

  return null;
}

function parseTime(value: string | null): TimeFilter | null {
  if (value === null || value === "all" || value === "30d" || value === "6m" || value === "1y") {
    return value ?? "all";
  }

  return null;
}

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401);
  }

  const rateLimitResponse = await enforceRateLimit({
    scope: "map-collections",
    request,
    userId: session.user.id,
    limit: 120,
    windowMs: 60 * 1000
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { searchParams } = new URL(request.url);
  const layer = parseLayer(searchParams.get("layer"));
  const time = parseTime(searchParams.get("time"));

  if (!layer) {
    return apiError("Invalid collection overlay mode.", 400, { code: "MAP_COLLECTIONS_MODE_INVALID" });
  }

  if (!time) {
    return apiError("Invalid collection overlay time filter.", 400, { code: "MAP_COLLECTIONS_TIME_INVALID" });
  }

  const groups = (searchParams.get("groups") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const collections = await getMapCollectionOverlays({
    viewerId: session.user.id,
    layer,
    groups,
    time
  });

  return Response.json({ collections });
}
